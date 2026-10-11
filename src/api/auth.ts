import type { RequestContext } from '../app/middleware'
import { validateRequired, readJsonObject, requireString, PhoneValidator, EmailValidator } from '../shared/validation'
import { sessionCookieHeader, clearSessionCookieHeader, readSessionToken } from '../app/middleware'
import { ValidationError } from '../shared/errors'

export async function handleLogin(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  validateRequired(body, ['username', 'password'])
  const username = requireString(body.username, 'username', { max: 128 })!
  const password = requireString(body.password, 'password', { max: 1024 })!
  const result = await ctx.modules.auth.login({ username, password })
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
  const body = await readJsonObject(request)
  validateRequired(body, ['phone'])
  const phone = requireString(body.phone, 'phone', { max: 32 })!
  new PhoneValidator().validate(phone)
  const name = requireString(body.name, 'name', { max: 120, optional: true }) ?? 'Customer'
  const email = requireString(body.email, 'email', { max: 254, optional: true })
  if (email) new EmailValidator().validate(email)
  const customer = await ctx.modules.customers.findOrCreate({ name, phone, email })

  await ctx.modules.auth.requestVerification({
    userId: customer.id,
    type: 'phone',
    identifier: customer.phone,
  })

  // Deliberately avoid revealing whether the number already existed.
  return Response.json({ ok: true, message: 'If the number can receive messages, a verification code has been sent.' })
}

export async function handleVerifyCustomerOtp(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  validateRequired(body, ['phone', 'code'])
  const phone = requireString(body.phone, 'phone', { max: 32 })!
  new PhoneValidator().validate(phone)
  const code = requireString(body.code, 'code', { min: 6, max: 6 })!
  if (!/^\d{6}$/.test(code)) throw new ValidationError('Invalid verification code format')
  const result = await ctx.modules.auth.verifyCode({ identifier: phone, code })
  const token = await ctx.modules.auth.createCustomerSession(result.userId)
  const response = Response.json({ ok: true, userId: result.userId })
  response.headers.set('Set-Cookie', sessionCookieHeader(token, request))
  return response
}
