import type { D1Database } from '@cloudflare/workers-types'
import type { BusinessHoursProvider, BusinessHours } from '../application/ports'

interface BusinessHoursRow {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: number
}

export class D1BusinessHoursProvider implements BusinessHoursProvider {
  constructor(private readonly db: D1Database) {}

  async getForDate(date: string): Promise<BusinessHours> {
    const [year, month, day] = date.split('-').map(Number)
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    const row = await this.db.prepare(
      `SELECT day_of_week, open_time, close_time, is_closed
       FROM business_hours WHERE day_of_week = ? LIMIT 1`,
    ).bind(dayOfWeek).first<BusinessHoursRow>()

    if (!row || row.is_closed === 1) {
      return { dayOfWeek, isOpen: false, openTime: null, closeTime: null }
    }

    const blocked = await this.db.prepare(
      `SELECT 1 AS blocked FROM blocked_periods
       WHERE start_date <= ? AND end_date >= ? LIMIT 1`,
    ).bind(date, date).first<{ blocked: number }>()

    if (blocked) {
      return { dayOfWeek, isOpen: false, openTime: null, closeTime: null }
    }

    return {
      dayOfWeek,
      isOpen: true,
      openTime: row.open_time,
      closeTime: row.close_time,
    }
  }
}
