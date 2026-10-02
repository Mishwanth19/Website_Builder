export interface Service {
  id: string
  name: string
  price: number
  duration: number  // in minutes
}

export interface Appointment {
  id?: number
  client_name: string
  client_phone: string
  client_email?: string
  service: string
  event_date: string
  appointment_date: string
  appointment_time: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  inputs_text?: string
  created_at?: string
  updated_at?: string
}

export interface Env {
  DB: D1Database
  // BUCKET: R2Bucket
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_FROM: string
  ARTIST_PHONE: string
}