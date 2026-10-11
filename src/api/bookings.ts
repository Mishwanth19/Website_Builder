import type { RequestContext } from '../app/middleware'
import { validateRequired, DateValidator, TimeValidator, PhoneValidator, EmailValidator, readJsonObject, requireString } from '../shared/validation'
import { ValidationError } from '../shared/errors'
import type { BookingStatus } from '../modules/booking'

async function resolveService(ctx: RequestContext, value: string) {
  try {
    return await ctx.modules.services.getById(value)
  } catch (error) {
    // Only fall back for a not-found result. Infrastructure failures must propagate.
    if (!(error instanceof Error) || !('code' in error) || (error as { code?: unknown }).code !== 'SERVICE_NOT_FOUND') throw error
  }
  const services = await ctx.modules.services.list({ activeOnly: false })
  const normalized = value.trim().toLowerCase()
  const service = services.find(s => s.name.trim().toLowerCase() === normalized)
  if (!service) throw new ValidationError('Service not found')
  return service
}

export async function handleGetAvailability(ctx: RequestContext, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const serviceValue = url.searchParams.get('serviceId') ?? url.searchParams.get('service')
  const date = url.searchParams.get('date')
  if (!serviceValue) throw new ValidationError('Service is required')
  if (serviceValue.length > 160) throw new ValidationError('Service identifier is too long')
  if (!date) throw new ValidationError('Date parameter is required')
  new DateValidator().validate(date)
  const service = await resolveService(ctx, serviceValue)
  const availability = await ctx.modules.bookings.getAvailability({
    serviceId: service.id,
    date,
  })
  return Response.json({
    ok: true,
    serviceId: service.id,
    date,
    available: availability.slots,
  })
}

export async function handleCreateBooking(ctx: RequestContext, request: Request): Promise<Response> {
  const body = await readJsonObject(request)
  const isLegacy = body.service !== undefined
  validateRequired(
    body,
    isLegacy
      ? ['client_name', 'client_phone', 'service', 'appointment_date', 'appointment_time']
      : ['client_name', 'client_phone', 'serviceId', 'appointmentDate', 'appointmentTime'],
  )
  const name = requireString(body.client_name, 'client_name', { max: 120 })!
  const phone = requireString(body.client_phone, 'client_phone', { max: 32 })!
  new PhoneValidator().validate(phone)
  const email = requireString(body.client_email, 'client_email', { max: 254, optional: true })
  if (email) new EmailValidator().validate(email)
  const serviceValue = requireString(isLegacy ? body.service : body.serviceId, isLegacy ? 'service' : 'serviceId', { max: 160 })!
  const service = await resolveService(ctx, serviceValue)
  const date = requireString(isLegacy ? body.appointment_date : body.appointmentDate, 'appointmentDate', { max: 10 })!
  const time = requireString(isLegacy ? body.appointment_time : body.appointmentTime, 'appointmentTime', { max: 5 })!
  new DateValidator().validate(date)
  new TimeValidator().validate(time)

  const eventDateRaw = body.eventDate ?? body.event_date
  const eventDate = requireString(eventDateRaw, 'eventDate', { max: 10, optional: true })
  if (eventDate) new DateValidator().validate(eventDate)
  const notes = requireString(body.notes ?? body.inputs_text, 'notes', { max: 2000, optional: true })
  const customer = await ctx.modules.customers.findOrCreate({ name, phone, email })
  const booking = await ctx.modules.bookings.create({
    customerId: customer.id,
    serviceId: service.id,
    appointmentDate: date,
    appointmentTime: time,
    eventDate: eventDate ?? null,
    notes: notes ?? null,
  })
  return Response.json({
    ok: true,
    booking,
    appointmentId: booking.id,
    message: `Hi ${customer.name}, your ${service.name} request is recorded for ${date} at ${time}.`,
  }, { status: 201 })
}

export async function handleGetBookings(ctx: RequestContext, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const status = url.searchParams.get('status') as BookingStatus | null
  const bookings = date
    ? await ctx.modules.bookings.findByDate(date)
    : await ctx.modules.bookings.findUpcoming(ctx.modules.timezone ? new Intl.DateTimeFormat('en-CA', { timeZone: ctx.modules.timezone }).format(new Date()) : new Date().toISOString().slice(0,10))
  const filtered = status ? bookings.filter(b => b.status === status) : bookings
  return Response.json({ ok: true, count: filtered.length, bookings: filtered })
}

export async function handleUpdateBookingStatus(ctx: RequestContext, request: Request, params: Record<string, string>): Promise<Response> {
  const body = await readJsonObject(request)
  const id = params.id || requireString(body.id, 'id', { max: 128, optional: true })
  if (!id) throw new ValidationError('Booking id is required')
  const status = requireString(body.status, 'status', { max: 20 })
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status!)) {
    throw new ValidationError('Invalid booking status')
  }
  const booking = await ctx.modules.bookings.updateStatus(id, status as BookingStatus)
  return Response.json({ ok: true, booking, updated: booking.status })
}

export async function handleClientBookings(ctx: RequestContext): Promise<Response> {
  if (!ctx.userId || ctx.userRole !== 'customer') {
    throw new ValidationError('Customer authentication is required')
  }
  const bookings = await ctx.modules.bookings.findByCustomer(ctx.userId)
  return Response.json({ ok: true, count: bookings.length, bookings })
}


export async function handleLegacyAdminView(ctx: RequestContext, request: Request): Promise<Response> {
  const url = new URL(request.url)
  const view = url.searchParams.get('view') ?? 'today'
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 100)
  let bookings
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: ctx.modules.timezone }).format(new Date())
  if (view === 'today') bookings = await ctx.modules.bookings.findByDate(today)
  else if (view === 'pending') bookings = (await ctx.modules.bookings.findUpcoming(today, limit)).filter(b => b.status === 'pending')
  else bookings = await ctx.modules.bookings.findUpcoming(today, limit)
  const services = await ctx.modules.services.list({ activeOnly: false })
  const serviceMap = new Map(services.map(s => [s.id, s.name]))
  const mapped = []
  for (const booking of bookings.slice(0, limit)) {
    const customer = await ctx.modules.customers.getById(booking.customerId)
    mapped.push({
      id: booking.id,
      service: serviceMap.get(booking.serviceId) ?? booking.serviceId,
      client_name: customer.name,
      client_phone: customer.phone,
      client_email: customer.email,
      event_date: booking.eventDate,
      appointment_date: booking.appointmentDate,
      appointment_time: booking.appointmentTime,
      status: booking.status,
      inputs_text: booking.notes,
      created_at: booking.createdAt,
      updated_at: booking.updatedAt,
    })
  }
  const grouped: Record<string, typeof mapped> = {}
  for (const booking of mapped) (grouped[booking.appointment_date] ??= []).push(booking)
  return Response.json({ ok: true, view, count: mapped.length, grouped, appointments: mapped })
}
