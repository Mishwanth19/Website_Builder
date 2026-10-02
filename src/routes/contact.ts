import { Env } from '../types'

export const handleContact = async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json()

    const required = ['name', 'phone', 'service', 'event_date']
    for (const field of required) {
      if (!body[field]) {
        return Response.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Store inquiry in D1
    await env.DB.prepare(
      `INSERT INTO appointments (
        client_name, client_phone, client_email, service, event_date,
        appointment_date, appointment_time, status, inputs_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.name,
      body.phone,
      body.email || null,
      body.service,
      body.event_date,
      null,  // no appointment date yet
      null,  // no time yet
      'pending',
      body.inputs_text || null
    ).run()

    // Send notification to artist (SMS)
    await sendArtistNotification(env, {
      name: body.name,
      phone: body.phone,
      service: body.service,
      date: body.event_date,
      inputs: body.inputs_text,
    })

    return Response.json({
      ok: true,
      message: `Thank you, ${body.name}. Your request has been sent. ${env.ARTIST_PHONE || 'We'} will contact you within 24 hours.`
    })

  } catch (error) {
    console.error('Contact error:', error)
    return Response.json({
      error: 'Failed to submit request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function sendArtistNotification(env: Env, data: any): Promise<void> {
  // Send SMS notification to artist
  console.log('Sending artist notification:', data)
  // Could call Twilio API or WhatsApp Business API here
}