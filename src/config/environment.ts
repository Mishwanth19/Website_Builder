import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

export interface Env {
  DB: D1Database
  BUCKET?: R2Bucket

  TWILIO_ACCOUNT_SID?: string
  TWILIO_AUTH_TOKEN?: string
  TWILIO_FROM?: string
  ARTIST_PHONE?: string

  ADMIN_USERNAME?: string
  ADMIN_PASSWORD?: string
  ADMIN_PASSWORD_HASH?: string

  ALLOWED_ORIGINS?: string
  BUSINESS_TIMEZONE?: string
}

export const DEFAULT_TIMEZONE = 'Asia/Kolkata'
