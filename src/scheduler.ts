import { Env } from './types'

// export default {
//   async scheduled(env: Env): Promise<void> {
//     // Run every day at 9 AM
//     await sendDailyReminders(env)
//     await sendPaymentReminders(env)
//     await sendThankYouFollowups(env)
//   },
// }

export async function runDailyJobs(env: Env): Promise<void> {
  await sendDailyReminders(env)
  await sendPaymentReminders(env)
  await sendThankYouFollowups(env)
}

async function sendDailyReminders(env: Env): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  // Get today's appointments
  const appointments = await env.DB.prepare(
    'SELECT * FROM appointments WHERE appointment_date = ? AND status = ?'
  ).bind(today, 'confirmed').all()

  for (const appt of appointments.results || []) {
    // Send SMS/WhatsApp reminder 1 hour before appointment
    await sendMessage(env, {
      phone: appt.client_phone,
      message: `Tomorrow you'll be ${appt.service} at ${appt.appointment_time} for your ${new Date(today).toLocaleDateString()}. ` +
             'Please arrive 15 minutes early. For changes, call us at +91 97000 00000.'
    })
  }
}

async function sendPaymentReminders(env: Env): Promise<void> {
  // Get appointments that need balance - created 24+ hours ago
  const appointments = await env.DB.prepare(
    'SELECT * FROM appointments WHERE status = ? AND created_at <= ?'
  ).bind('pending', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).all()

  for (const appt of appointments.results || []) {
    // Send payment reminder for appointments created 24+ hours ago
    await sendMessage(env, {
      phone: appt.client_phone,
      message: `Hi ${appt.client_name}, your ${appt.service} booking is almost ready! ` +
             'Please pay 50% of the quoted amount to secure your slot. ' +
             'Call +91 97000 00000 to confirm.'
    })
  }
}

async function sendThankYouFollowups(env: Env): Promise<void> {
  // Get recently completed appointments (last 7 days) that haven't received thank you
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const appointments = await env.DB.prepare(
    'SELECT * FROM appointments WHERE status = ? AND updated_at >= ?'
  ).bind('completed', sevenDaysAgo.toISOString()).all()

  for (const appt of appointments.results || []) {
    // Check if we already sent thank you (could add a field for this)
    await sendMessage(env, {
      phone: appt.client_phone,
      message: `Thank you for choosing Lumière Bridal! We hope you loved your ${appt.service}. ` +
             'Please consider leaving a review on Google/Instagram. Refer a friend and get 10% off your next service!'
    })
  }
}

async function sendMessage(env: Env, { phone, message }: { phone: string; message: string }): Promise<void> {
  // For development: log instead of sending
  console.log('[SMS] To:', phone, '| Message:', message)

  // For production: integrate with Twilio, WhatsApp Business API, or SMS provider
  // Example Twilio:
  /*
  const accountSid = env.TWILIO_ACCOUNT_SID
  const authToken = env.TWILIO_AUTH_TOKEN
  const from = env.TWILIO_FROM

  if (!accountSid || !authToken || !from) {
    console.warn('Twilio credentials not configured - skipping SMS')
    return
  }

  const body = new URLSearchParams({
    To: phone,
    From: from,
    Body: message
  })

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })
  */
}