import { Env } from '../types'

export const handleClientView = async (request: Request, env: Env): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const phone = url.searchParams.get('phone')
    const email = url.searchParams.get('email')

    if (!phone) {
      return Response.json({ error: 'Phone parameter is required' }, { status: 400 })
    }

    // Find all appointments for this phone number
    const appointments = await env.DB.prepare(
      'SELECT * FROM appointments WHERE client_phone = ? ORDER BY appointment_date ASC'
    ).bind(phone).all()

    const results = appointments.results || []

    // Return appointments (excluding sensitive data if needed)
    return Response.json({
      ok: true,
      client_phone: phone,
      count: results.length,
      appointments: results.map((appt: any) => ({
        id: appt.id,
        service: appt.service,
        event_date: appt.event_date,
        appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time,
        status: appt.status,
        inputs_text: appt.inputs_text,
        created_at: appt.created_at,
      }))
    })

  } catch (error) {
    console.error('Client view error:', error)
    return Response.json({
      error: 'Failed to fetch appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}