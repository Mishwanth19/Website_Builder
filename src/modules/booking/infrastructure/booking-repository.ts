import type { D1Database } from '@cloudflare/workers-types'
import type { Booking, BookingStatus } from '../domain/booking'
import type { BookingRepository, BookingUpdate } from '../application/ports'

interface BookingRow {
  id: string
  customer_id: string
  service_id: string
  event_date: string | null
  appointment_date: string
  appointment_time: string
  status: BookingStatus
  notes: string | null
  price_at_booking: number
  duration_at_booking: number
  staff_id: string | null
  created_at: string
  updated_at: string
}

export class D1BookingRepository implements BookingRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Booking | null> {
    const row = await this.db
      .prepare('SELECT * FROM bookings WHERE id = ? LIMIT 1')
      .bind(id)
      .first<BookingRow>()

    return row ? this.rowToBooking(row) : null
  }

  async findByCustomer(
    customerId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<Booking[]> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100)
    const offset = Math.max(options.offset ?? 0, 0)

    const result = await this.db
      .prepare(
        `SELECT * FROM bookings
         WHERE customer_id = ?
         ORDER BY appointment_date ASC, appointment_time ASC
         LIMIT ? OFFSET ?`,
      )
      .bind(customerId, limit, offset)
      .all<BookingRow>()

    return (result.results ?? []).map((row) => this.rowToBooking(row))
  }

  async findByDate(date: string): Promise<Booking[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM bookings
         WHERE appointment_date = ?
           AND status != 'cancelled'
         ORDER BY appointment_time ASC`,
      )
      .bind(date)
      .all<BookingRow>()

    return (result.results ?? []).map((row) => this.rowToBooking(row))
  }

  async findUpcoming(fromDate: string, limit = 50): Promise<Booking[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100)

    const result = await this.db
      .prepare(
        `SELECT * FROM bookings
         WHERE appointment_date >= ?
           AND status != 'cancelled'
         ORDER BY appointment_date ASC, appointment_time ASC
         LIMIT ?`,
      )
      .bind(fromDate, safeLimit)
      .all<BookingRow>()

    return (result.results ?? []).map((row) => this.rowToBooking(row))
  }

  async findOverlapping(params: {
    appointmentDate: string
    appointmentTime: string
    durationMinutes: number
    staffId?: string | null
    excludeBookingId?: string
  }): Promise<Booking | null> {
    // SQLite cannot directly compare HH:mm + duration without conversion logic.
    // We store duration_at_booking and compare minute offsets in the query.
    // The application layer performs the same interval calculation for the
    // returned records; this query narrows candidates to the requested date.
    let query =
      `SELECT * FROM bookings
       WHERE appointment_date = ?
         AND status != 'cancelled'`

    const paramsList: unknown[] = [params.appointmentDate]

    if (params.staffId) {
      query += ' AND (staff_id IS NULL OR staff_id = ?)'
      paramsList.push(params.staffId)
    }

    if (params.excludeBookingId) {
      query += ' AND id != ?'
      paramsList.push(params.excludeBookingId)
    }

    query += ' ORDER BY appointment_time ASC'

    const result = await this.db.prepare(query).bind(...paramsList).all<BookingRow>()
    const requestedStart = toMinutes(params.appointmentTime)
    const requestedEnd = requestedStart + params.durationMinutes

    const overlapping = (result.results ?? []).find((row) => {
      const existingStart = toMinutes(row.appointment_time)
      const existingEnd = existingStart + row.duration_at_booking
      return requestedStart < existingEnd && existingStart < requestedEnd
    })

    return overlapping ? this.rowToBooking(overlapping) : null
  }

  async create(booking: Booking): Promise<Booking> {
    const result = await this.db.prepare(
      `INSERT INTO bookings (
        id, customer_id, service_id, event_date, appointment_date, appointment_time,
        status, notes, price_at_booking, duration_at_booking, staff_id, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM bookings existing
        WHERE existing.appointment_date = ?
          AND existing.status != 'cancelled'
          AND (? IS NULL OR existing.staff_id IS NULL OR existing.staff_id = ?)
          AND (
            (
              CAST(substr(existing.appointment_time, 1, 2) AS INTEGER) * 60 +
              CAST(substr(existing.appointment_time, 4, 2) AS INTEGER)
            ) < (
              CAST(substr(?, 1, 2) AS INTEGER) * 60 +
              CAST(substr(?, 4, 2) AS INTEGER) + ?
            )
          )
          AND (
            (
              CAST(substr(?, 1, 2) AS INTEGER) * 60 +
              CAST(substr(?, 4, 2) AS INTEGER)
            ) < (
              CAST(substr(existing.appointment_time, 1, 2) AS INTEGER) * 60 +
              CAST(substr(existing.appointment_time, 4, 2) AS INTEGER) + existing.duration_at_booking
            )
          )
      )`,
    ).bind(
      booking.id, booking.customerId, booking.serviceId, booking.eventDate, booking.appointmentDate,
      booking.appointmentTime, booking.status, booking.notes, booking.priceAtBooking,
      booking.durationAtBooking, booking.staffId, booking.createdAt, booking.updatedAt,
      booking.appointmentDate, booking.staffId, booking.staffId,
      booking.appointmentTime, booking.appointmentTime, booking.durationAtBooking,
      booking.appointmentTime, booking.appointmentTime,
    ).run()

    if ((result.meta?.changes ?? 0) !== 1) {
      throw new Error('BOOKING_CONFLICT')
    }

    return booking
  }

  async update(id: string, changes: BookingUpdate): Promise<Booking> {
    const existing = await this.findById(id)
    if (!existing) throw new Error(`Booking not found: ${id}`)

    const next: Booking = {
      ...existing,
      status: changes.status ?? existing.status,
      notes: changes.notes !== undefined ? changes.notes : existing.notes,
      staffId: changes.staffId !== undefined ? changes.staffId : existing.staffId,
      eventDate: changes.eventDate !== undefined ? changes.eventDate : existing.eventDate,
      updatedAt: changes.updatedAt ?? existing.updatedAt,
    }

    await this.db
      .prepare(
        `UPDATE bookings
         SET status = ?, notes = ?, staff_id = ?, event_date = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        next.status,
        next.notes,
        next.staffId,
        next.eventDate,
        next.updatedAt,
        id,
      )
      .run()

    return next
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
  }

  private rowToBooking(row: BookingRow): Booking {
    return {
      id: row.id,
      customerId: row.customer_id,
      serviceId: row.service_id,
      eventDate: row.event_date,
      appointmentDate: row.appointment_date,
      appointmentTime: row.appointment_time,
      status: row.status,
      notes: row.notes,
      priceAtBooking: row.price_at_booking,
      durationAtBooking: row.duration_at_booking,
      staffId: row.staff_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}
