import type { ScheduledController, ExecutionContext } from '@cloudflare/workers-types'
import { createModules } from './app/composition'
import { Router } from './app/router'
import { applyCors, applySecurityHeaders, enforceRateLimit, handleCors, withRequestContext, type RequestContext, parseAllowedOrigins } from './app/middleware'
import { AppError } from './shared/errors'
import { logger } from './shared/logging'
import { handleLogin, handleVerify, handleLogout, handleRequestCustomerOtp, handleVerifyCustomerOtp } from './api/auth'
import { handleGetAvailability, handleCreateBooking, handleGetBookings, handleUpdateBookingStatus, handleClientBookings, handleLegacyAdminView } from './api/bookings'
import { handleGetServices, handleGetService } from './api/services'
import { handleCreateInquiry, handleGetInquiries, handleLegacyContact } from './api/inquiries'
import { handleHealth } from './api/health'
import type { Env } from './config/environment'

function buildRouter(): Router {
  const router = new Router()

  router.get('/healthz', handleHealth)
  router.get('/readyz', handleHealth)
  router.get('/health', handleHealth)
  router.get('/api/health', handleHealth)

  router.get('/api/services', handleGetServices)
  router.get('/api/services/:id', (ctx, _request, params) => handleGetService(ctx, params))
  router.get('/api/availability', handleGetAvailability)

  router.post('/api/bookings', handleCreateBooking)
  router.post('/api/book', handleCreateBooking)

  router.post('/api/inquiries', handleCreateInquiry)
  router.post('/api/contact', handleLegacyContact)

  router.post('/api/auth/login', handleLogin)
  router.get('/api/auth/verify', handleVerify, { auth: true })
  router.post('/api/auth/logout', handleLogout, { auth: true })
  router.post('/api/auth/customer/request-otp', handleRequestCustomerOtp)
  router.post('/api/auth/customer/verify-otp', handleVerifyCustomerOtp)

  router.get('/api/client-view', handleClientBookings, { auth: true, roles: ['customer'] })

  router.get('/api/bookings', handleGetBookings, { auth: true, roles: ['admin', 'staff'] })
  router.get('/api/appointments', handleGetBookings, { auth: true, roles: ['admin', 'staff'] })
  router.patch('/api/bookings/:id/status', handleUpdateBookingStatus, { auth: true, roles: ['admin', 'staff'] })
  router.patch('/api/appointments/:id/status', handleUpdateBookingStatus, { auth: true, roles: ['admin', 'staff'] })
  router.patch('/api/appointments', handleUpdateBookingStatus, { auth: true, roles: ['admin', 'staff'] })
  router.get('/api/admin-view', handleLegacyAdminView, { auth: true, roles: ['admin', 'staff'] })
  router.get('/api/inquiries', handleGetInquiries, { auth: true, roles: ['admin', 'staff'] })

  return router
}

const router = buildRouter()
let modulesPromise: Promise<Awaited<ReturnType<typeof createModules>>> | undefined

function getModules(env: Env) {
  if (!modulesPromise) {
    const pending = createModules(env)
    modulesPromise = pending
    void pending.catch(() => {
      if (modulesPromise === pending) modulesPromise = undefined
    })
  }
  return modulesPromise
}

function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { status: error.statusCode })
  }

  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code) : ''
  const message = error instanceof Error ? error.message : 'Internal server error'

  const statusByCode: Record<string, number> = {
    INVALID_CREDENTIALS: 401,
    SESSION_EXPIRED: 401,
    VERIFICATION_EXPIRED: 401,
    TOO_MANY_VERIFICATION_ATTEMPTS: 429,
    BOOKING_CONFLICT: 409,
    BOOKING_NOT_FOUND: 404,
    CUSTOMER_NOT_FOUND: 404,
    SERVICE_NOT_FOUND: 404,
    INQUIRY_NOT_FOUND: 404,
    VALIDATION_ERROR: 400,
    BOOKING_VALIDATION_ERROR: 400,
    CUSTOMER_VALIDATION_ERROR: 400,
    SERVICE_VALIDATION_ERROR: 400,
    PAYMENT_VALIDATION_ERROR: 400,
    AUTHENTICATION_ERROR: 401,
    INQUIRY_VALIDATION_ERROR: 400,
    INVALID_BOOKING_TRANSITION: 409,
    INVALID_INQUIRY_STATUS_TRANSITION: 409,
    INVALID_PAYMENT_STATE: 409,
  }

  const status = statusByCode[code] ?? 500
  return Response.json({
    error: status >= 500 ? 'Internal server error' : message,
    code: code || 'INTERNAL_ERROR',
  }, { status })
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const allowedOrigins = parseAllowedOrigins(env)
  const preflight = handleCors(request, allowedOrigins)
  if (preflight) return applySecurityHeaders(preflight)

  try {
    const limited = await enforceRateLimit(request, env)
    if (limited) return applySecurityHeaders(applyCors(request, limited, allowedOrigins))

    const modules = await getModules(env)
    const response = await withRequestContext(
      request,
      env,
      modules,
      (ctx: RequestContext) => router.handle(request, ctx),
    )
    return applySecurityHeaders(applyCors(request, response, allowedOrigins))
  } catch (error) {
    logger.error('Request failed before a response was produced', error instanceof Error ? error : new Error('Unknown request failure'))
    const response = errorResponse(error)
    return applySecurityHeaders(applyCors(request, response, allowedOrigins))
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, env)
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const modules = await getModules(env)
    await modules.scheduler.executeAll()
    // Expired fixed-window buckets are safe to remove; failures here must not undo scheduled work.
    try {
      await env.DB.prepare('DELETE FROM request_rate_limits WHERE expires_at < ?')
        .bind(Math.floor(Date.now() / 1000)).run()
    } catch {
      // The next scheduled run can retry cleanup. Request limiting remains functional.
    }
  },
}
