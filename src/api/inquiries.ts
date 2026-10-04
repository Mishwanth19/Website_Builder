import type { RequestContext } from '../app/middleware'
import { validateRequired, DateValidator, PhoneValidator } from '../shared/validation'

export async function handleCreateInquiry(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, unknown>
  validateRequired(body, ['name', 'phone'])
  new PhoneValidator().validate(String(body.phone))
  if (body.eventDate) new DateValidator().validate(String(body.eventDate))
  const inquiry = await ctx.modules.inquiries.create({
    name: String(body.name),
    phone: String(body.phone),
    email: body.email ? String(body.email) : undefined,
    serviceId: body.serviceId ? String(body.serviceId) : undefined,
    eventDate: body.eventDate ? String(body.eventDate) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
  })
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
  const body = await request.json() as Record<string, unknown>
  validateRequired(body, ['name', 'phone', 'service', 'event_date'])
  new PhoneValidator().validate(String(body.phone))
  new DateValidator().validate(String(body.event_date))
  const services = await ctx.modules.services.list({ activeOnly: false })
  const service = services.find(s => s.name.toLowerCase() === String(body.service).toLowerCase())
  const inquiry = await ctx.modules.inquiries.create({
    name: String(body.name),
    phone: String(body.phone),
    email: body.email ? String(body.email) : undefined,
    serviceId: service?.id,
    eventDate: String(body.event_date),
    notes: body.inputs_text ? String(body.inputs_text) : undefined,
  })
  return Response.json({
    ok: true,
    inquiry,
    message: `Thank you, ${body.name}. Your request has been received.`,
  }, { status: 201 })
}
