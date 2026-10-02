import { Env } from '../types'

export const handleAvailability = async (request: Request, env: Env): Promise<Response> => {
  const url = new URL(request.url)
  const service = url.searchParams.get('service') || 'bridal makeup'
  const date = url.searchParams.get('date')

  if (!date) {
    return Response.json({ error: 'Date parameter is required' }, { status: 400 })
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
  }

  // Check what's already booked on that date
  const booked = await env.DB.prepare(
    'SELECT appointment_time FROM appointments WHERE appointment_date = ? AND status != ?'
  ).bind(date, 'cancelled').all()

  const bookedTimes = new Set(booked.results?.map((r: any) => r.appointment_time) || [])

  // Default availability slots - can be customized per service
  const serviceHours = {
    'bridal makeup': ['09:00', '11:00', '14:00', '16:00'],
    'hair and draping': ['09:00', '11:00', '14:00', '16:00'],
    'engagement and reception': ['09:00', '11:00', '14:00', '16:00'],
    'family and guests': ['10:00', '13:00', '15:00'],
    'private lesson': ['10:00', '14:00', '16:00'],
  }

  const slots = serviceHours[service as keyof typeof serviceHours] || serviceHours['bridal makeup']
  const available = slots.filter((time) => !bookedTimes.has(time))

  return Response.json({ service, date, available })
}