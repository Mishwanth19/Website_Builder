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

export function corsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

export function handleCors(request: Request, allowedOrigins: string[]): Response | null {
  if (request.method !== 'OPTIONS') return null
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders(request.headers.get('Origin'), allowedOrigins), 'Access-Control-Max-Age': '86400' },
  })
}

export function applyCors(request: Request, response: Response, allowedOrigins: string[]): Response {
  const next = new Response(response.body, response)
  for (const [key, value] of Object.entries(corsHeaders(request.headers.get('Origin'), allowedOrigins))) {
    next.headers.set(key, value)
  }
  return next
}

export function readSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie') ?? ''
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === SESSION_COOKIE) return decodeURIComponent(rest.join('='))
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
  const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID()
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
