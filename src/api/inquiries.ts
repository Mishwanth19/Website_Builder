import type { RequestContext } from '../app/middleware'
import { validateRequired, DateValidator, PhoneValidator, EmailValidator, readJsonObject, requireString } from '../shared/validation'

export async function handleCreateInquiry(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  validateRequired(body, ['name', 'phone'])
  const name = requireString(body.name, 'name', { max: 120 })!
  const phone = requireString(body.phone, 'phone', { max: 32 })!
  new PhoneValidator().validate(phone)
  const email = requireString(body.email, 'email', { max: 254, optional: true })
  if (email) new EmailValidator().validate(email)
  const serviceId = requireString(body.serviceId, 'serviceId', { max: 128, optional: true })
  const eventDate = requireString(body.eventDate, 'eventDate', { max: 10, optional: true })
  if (eventDate) new DateValidator().validate(eventDate)
  const notes = requireString(body.notes, 'notes', { max: 2000, optional: true })
  const inquiry = await ctx.modules.inquiries.create({ name, phone, email, serviceId, eventDate, notes })
  return Response.json({ ok: true, inquiry }, { status: 201 })
}

export async function handleGetInquiries(ctx: RequestContext, request: Request): Promise<Response> {
  const status = new URL(request.url).searchParams.get('status')
  const inquiries = status
    ? await ctx.modules.inquiries.findByStatus(status as never)
    : await ctx.modules.inquiries.findAll()
  return Response.json({ ok: true, inquiries })
}


export async function handleLegacyContact(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  validateRequired(body, ['name', 'phone', 'service', 'event_date'])
  const name = requireString(body.name, 'name', { max: 120 })!
  const phone = requireString(body.phone, 'phone', { max: 32 })!
  new PhoneValidator().validate(phone)
  const email = requireString(body.email, 'email', { max: 254, optional: true })
  if (email) new EmailValidator().validate(email)
  const serviceName = requireString(body.service, 'service', { max: 160 })!
  const eventDate = requireString(body.event_date, 'event_date', { max: 10 })!
  new DateValidator().validate(eventDate)
  const notes = requireString(body.inputs_text, 'inputs_text', { max: 2000, optional: true })
  const services = await ctx.modules.services.list({ activeOnly: false })
  const service = services.find(s => s.name.toLowerCase() === serviceName.toLowerCase())
  const inquiry = await ctx.modules.inquiries.create({ name, phone, email, serviceId: service?.id, eventDate, notes })
  return Response.json({
    ok: true,
    inquiry,
    message: `Thank you, ${name}. Your request has been received.`,
  }, { status: 201 })
}
