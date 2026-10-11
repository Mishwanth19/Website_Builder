import type { Env } from '../config/environment'
import type { AppModules } from './composition'
import { logger } from '../shared/logging'

export const SESSION_COOKIE = 'session'

export interface RequestContext {
  requestId: string
  env: Env
  modules: AppModules
  userId?: string
  userRole?: 'admin' | 'staff' | 'customer'
}

export function parseAllowedOrigins(env: Env): string[] {
  const configured = env.ALLOWED_ORIGINS?.split(',').map(v => v.trim()).filter(Boolean)
  return configured?.length ? configured : ['http://localhost:8787', 'http://127.0.0.1:8787']
}

export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  return !!origin && allowedOrigins.includes(origin)
}

export function corsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (isAllowedOrigin(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin!
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PATCH,DELETE,OPTIONS'
    headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

export function handleCors(request: Request, allowedOrigins: string[]): Response | null {
  if (request.method !== 'OPTIONS') return null
  const origin = request.headers.get('Origin')
  if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
    return new Response(null, { status: 403, headers: { Vary: 'Origin' } })
  }
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(origin, allowedOrigins), 'Access-Control-Max-Age': '86400' },
  })
}

export function applyCors(request: Request, response: Response, allowedOrigins: string[]): Response {
  const next = new Response(response.body, response)
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get('Origin'), allowedOrigins))) {
    next.headers.set(key, value)
  }
  return next
}

export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  headers.set('Cache-Control', headers.get('Cache-Control') ?? 'no-store')
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

/** D1-backed fixed-window rate limiter. Keys are hashed to avoid storing raw IP addresses. */
export async function enforceRateLimit(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  const policies: Record<string, { limit: number; windowSeconds: number }> = {
    '/api/auth/login': { limit: 8, windowSeconds: 60 },
    '/api/availability': { limit: 60, windowSeconds: 60 },
    '/api/auth/customer/request-otp': { limit: 5, windowSeconds: 600 },
    '/api/auth/customer/verify-otp': { limit: 10, windowSeconds: 600 },
    '/api/bookings': { limit: 8, windowSeconds: 60 },
    '/api/book': { limit: 8, windowSeconds: 60 },
    '/api/inquiries': { limit: 10, windowSeconds: 60 },
    '/api/contact': { limit: 10, windowSeconds: 60 },
  }
  const policy = policies[path]
  if (!policy) return null

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown-client'
  const now = Math.floor(Date.now() / 1000)
  const windowStart = Math.floor(now / policy.windowSeconds) * policy.windowSeconds
  const material = `${path}:${ip}:${windowStart}`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material))
  const bucketKey = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')

  try {
    const row = await env.DB.prepare(
      `INSERT INTO request_rate_limits (bucket_key, hits, expires_at)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET hits = hits + 1
       RETURNING hits`,
    ).bind(bucketKey, windowStart + policy.windowSeconds * 2).first<{ hits: number }>()

    if (!row) throw new Error('Rate limiter did not return a result')
    if (row.hits > policy.limit) {
      return Response.json(
        { error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMIT_ERROR' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, windowStart + policy.windowSeconds - now)), 'Cache-Control': 'no-store' } },
      )
    }
    return null
  } catch (error) {
    logger.error('Rate limiter check failed', error instanceof Error ? error : new Error('Unknown rate limiter failure'), { path })
    // Fail closed for abuse-sensitive endpoints if the limiter cannot be checked.
    return Response.json(
      { error: 'Service temporarily unavailable. Please try again shortly.', code: 'RATE_LIMIT_UNAVAILABLE' },
      { status: 503, headers: { 'Retry-After': '10', 'Cache-Control': 'no-store' } },
    )
  }
}

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? ''
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === SESSION_COOKIE) {
      try { return decodeURIComponent(rest.join('=')) } catch { return null }
    }
  }
  const auth = request.headers.get('Authorization')
  return auth?.startsWith('Bearer ') ? auth.slice(7) : null
}

export function sessionCookieHeader(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === 'https:'
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    secure ? 'SameSite=None' : 'SameSite=Lax',
    'Max-Age=86400',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

export function clearSessionCookieHeader(request: Request): string {
  const secure = new URL(request.url).protocol === 'https:'
  return [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    secure ? 'SameSite=None' : 'SameSite=Lax',
    'Max-Age=0',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}

export async function withRequestContext(
  request: Request,
  env: Env,
  modules: AppModules,
  handler: (ctx: RequestContext) => Promise<Response>,
): Promise<Response> {
  const suppliedRequestId = request.headers.get('X-Request-ID')
  const requestId = suppliedRequestId && /^[A-Za-z0-9._-]{1,80}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : crypto.randomUUID()
  const ctx: RequestContext = { requestId, env, modules }
  const requestLogger = logger.withContext({ requestId })

  try {
    const token = readSessionToken(request)
    if (token) {
      const session = await modules.auth.verifySession(token)
      if (session) {
        ctx.userId = session.userId
        ctx.userRole = session.userType as RequestContext['userRole']
      }
    }
    const response = await handler(ctx)
    response.headers.set('X-Request-ID', requestId)
    return response
  } catch (error) {
    requestLogger.error('Request failed', error as Error)
    throw error
  }
}

export async function authenticateRequest(request: Request, ctx: RequestContext): Promise<void> {
  const token = readSessionToken(request)
  if (!token) return
  const session = await ctx.modules.auth.verifySession(token)
  if (session) {
    ctx.userId = session.userId
    ctx.userRole = session.userType as RequestContext['userRole']
  }
}
