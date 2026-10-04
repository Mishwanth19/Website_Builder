export const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export interface Booking {
  id: string
  customerId: string
  serviceId: string
  eventDate: string | null
  appointmentDate: string
  appointmentTime: string
  status: BookingStatus
  notes: string | null
  priceAtBooking: number
  durationAtBooking: number
  staffId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateBookingData {
  id: string
  customerId: string
  serviceId: string
  eventDate?: string | null
  appointmentDate: string
  appointmentTime: string
  status?: BookingStatus
  notes?: string | null
  priceAtBooking: number
  durationAtBooking: number
  staffId?: string | null
  createdAt: string
  updatedAt: string
}

export class BookingValidationError extends Error {
  readonly code = 'BOOKING_VALIDATION_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'BookingValidationError'
  }
}

export class InvalidBookingTransitionError extends Error {
  readonly code = 'INVALID_BOOKING_TRANSITION'

  constructor(from: BookingStatus, to: BookingStatus) {
    super(`Cannot transition booking from ${from} to ${to}`)
    this.name = 'InvalidBookingTransitionError'
  }
}

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function isValidTime(value: string): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false

  return true
}

export function timeToMinutes(value: string): number {
  if (!isValidTime(value)) {
    throw new BookingValidationError(`Invalid time: ${value}`)
  }

  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= 24 * 60) {
    throw new BookingValidationError(`Invalid time in minutes: ${value}`)
  }

  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const start = timeToMinutes(startTime)

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new BookingValidationError('Duration must be a positive integer')
  }

  const end = start + durationMinutes
  if (end > 24 * 60) {
    throw new BookingValidationError('Booking cannot extend past midnight')
  }

  return minutesToTime(end)
}

export function intervalsOverlap(
  startA: string,
  durationA: number,
  startB: string,
  durationB: number,
): boolean {
  const aStart = timeToMinutes(startA)
  const bStart = timeToMinutes(startB)
  const aEnd = aStart + durationA
  const bEnd = bStart + durationB

  return aStart < bEnd && bStart < aEnd
}

export class BookingEntity implements Booking {
  readonly id: string
  readonly customerId: string
  readonly serviceId: string
  readonly eventDate: string | null
  readonly appointmentDate: string
  readonly appointmentTime: string
  readonly status: BookingStatus
  readonly notes: string | null
  readonly priceAtBooking: number
  readonly durationAtBooking: number
  readonly staffId: string | null
  readonly createdAt: string
  readonly updatedAt: string

  constructor(data: CreateBookingData | Booking) {
    this.validate(data)

    this.id = data.id
    this.customerId = data.customerId
    this.serviceId = data.serviceId
    this.eventDate = data.eventDate ?? null
    this.appointmentDate = data.appointmentDate
    this.appointmentTime = data.appointmentTime
    this.status = data.status ?? 'pending'
    this.notes = data.notes ?? null
    this.priceAtBooking = data.priceAtBooking
    this.durationAtBooking = data.durationAtBooking
    this.staffId = data.staffId ?? null
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  transitionTo(status: BookingStatus, now: string): BookingEntity {
    if (this.status === status) return this

    if (!TRANSITIONS[this.status].includes(status)) {
      throw new InvalidBookingTransitionError(this.status, status)
    }

    return new BookingEntity({
      ...this,
      status,
      updatedAt: now,
    })
  }

  confirm(now: string): BookingEntity {
    return this.transitionTo('confirmed', now)
  }

  cancel(now: string): BookingEntity {
    return this.transitionTo('cancelled', now)
  }

  complete(now: string): BookingEntity {
    return this.transitionTo('completed', now)
  }

  private validate(data: CreateBookingData | Booking): void {
    if (!data.id.trim()) throw new BookingValidationError('Booking id is required')
    if (!data.customerId.trim()) throw new BookingValidationError('Customer id is required')
    if (!data.serviceId.trim()) throw new BookingValidationError('Service id is required')

    if (!isValidDate(data.appointmentDate)) {
      throw new BookingValidationError('Invalid appointment date')
    }

    if (!isValidTime(data.appointmentTime)) {
      throw new BookingValidationError('Invalid appointment time')
    }

    if (data.eventDate !== null && data.eventDate !== undefined && !isValidDate(data.eventDate)) {
      throw new BookingValidationError('Invalid event date')
    }

    if (!BOOKING_STATUSES.includes(data.status ?? 'pending')) {
      throw new BookingValidationError('Invalid booking status')
    }

    if (!Number.isFinite(data.priceAtBooking) || data.priceAtBooking < 0) {
      throw new BookingValidationError('Price at booking must be a non-negative number')
    }

    if (!Number.isInteger(data.durationAtBooking) || data.durationAtBooking <= 0) {
      throw new BookingValidationError('Duration at booking must be a positive integer')
    }

    calculateEndTime(data.appointmentTime, data.durationAtBooking)

    if (!data.createdAt || !data.updatedAt) {
      throw new BookingValidationError('Booking timestamps are required')
    }
  }
}
