import { Env } from '../types'

export const handleBook = async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json()

    // Validate required fields
    const required = ['client_name', 'client_phone', 'service', 'appointment_date', 'appointment_time']
    for (const field of required) {
      if (!body[field]) {
        return Response.json({
          error: `Missing required field: ${field}`,
          details: `All fields are required: ${required.join(', ')}`
        }, { status: 400 })
      }
    }

    // Validate phone number format
    const phoneRegex = /^\+?\d{10,15}$/
    if (!phoneRegex.test(body.client_phone.replace(/\s+/g, ''))) {
      return Response.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Check slot isn't already taken
    const conflict = await env.DB.prepare(
      `SELECT id, client_name FROM appointments
       WHERE appointment_date = ? AND appointment_time = ? AND status != ?`
    ).bind(body.appointment_date, body.appointment_time, 'cancelled').first()

    if (conflict) {
      return Response.json({
        error: 'Sorry, that time slot is no longer available',
        availableSlot: body.appointment_time + ' was booked by ' + conflict.client_name
      }, { status: 409 })
    }

    // Send appointment to D1
    const result = await env.DB.prepare(
      `INSERT INTO appointments (
         client_name, client_phone, client_email, service, event_date,
         appointment_date, appointment_time, status, inputs_text
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.client_name,
      body.client_phone,
      body.client_email || null,
      body.service,
      body.event_date || null,
      body.appointment_date,
      body.appointment_time,
      'pending',
      body.inputs_text || null
    ).run()

    // Send appointment confirmation SMS (via API function)
    await sendConfirmationSMS(env, {
      client_name: body.client_name,
      client_phone: body.client_phone,
      service: body.service,
      date: body.appointment_date,
      time: body.appointment_time,
    })

    return Response.json({
      ok: true,
      appointmentId: result.meta.last_row_id,
      message: `Hi ${body.client_name}, your ${body.service} appointment is confirmed for ${body.appointment_date} at ${body.appointment_time}:00. You'll receive a reminder tomorrow.`
    })

  } catch (error) {
    console.error('Booking error:', error)
    return Response.json({
      error: 'Failed to book appointment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function sendConfirmationSMS(env: Env, data: any): Promise<void> {
  // Use Twilio API or Webhook to your SMS service
  // For free tier development, can implement WhatsApp Business API call or use existing service
  console.log('Would send SMS/WhatsApp to:', data)
  console.log('Message: Confirmation for ' + data.service + ' on ' + data.date + ' at ' + data.time)
}