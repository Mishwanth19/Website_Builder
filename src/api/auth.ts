import type { RequestContext } from '../app/middleware'
import { validateRequired } from '../shared/validation'
import { sessionCookieHeader, clearSessionCookieHeader, readSessionToken } from '../app/middleware'

export async function handleLogin(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>
  validateRequired(body, ['username', 'password'])
  const result = await ctx.modules.auth.login({
    username: String(body.username),
    password: String(body.password),
  })
  const response = Response.json({ ok: true, userId: result.userId, userType: result.userType })
  response.headers.set('Set-Cookie', sessionCookieHeader(result.token, request))
  return response
}

export async function handleVerify(ctx: RequestContext, request: Request): Promise<Response> {
  const token = readSessionToken(request)
  if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 })
  const result = await ctx.modules.auth.verifySession(token)
  if (!result) return Response.json({ error: 'Invalid or expired session' }, { status: 401 })
  return Response.json({ ok: true, valid: true, ...result })
}

export async function handleLogout(ctx: RequestContext, request: Request): Promise<Response> {
  const token = readSessionToken(request)
  if (token) await ctx.modules.auth.logout(token)
  const response = Response.json({ ok: true })
  response.headers.set('Set-Cookie', clearSessionCookieHeader(request))
  return response
}

export async function handleRequestCustomerOtp(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>
  validateRequired(body, ['phone'])
  const phone = String(body.phone)
  const customer = await ctx.modules.customers.findOrCreate({
    name: body.name ? String(body.name) : 'Customer',
    phone,
    email: body.email ? String(body.email) : undefined,
  })

  await ctx.modules.auth.requestVerification({
    userId: customer.id,
    type: 'phone',
    identifier: customer.phone,
  })

  // Deliberately avoid revealing whether the number already existed.
  return Response.json({ ok: true, message: 'If the number can receive messages, a verification code has been sent.' })
}

export async function handleVerifyCustomerOtp(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>
  validateRequired(body, ['phone', 'code'])
  const phone = String(body.phone)
  const result = await ctx.modules.auth.verifyCode({ identifier: phone, code: String(body.code) })
  const token = await ctx.modules.auth.createCustomerSession(result.userId)
  const response = Response.json({ ok: true, userId: result.userId })
  response.headers.set('Set-Cookie', sessionCookieHeader(token, request))
  return response
}
