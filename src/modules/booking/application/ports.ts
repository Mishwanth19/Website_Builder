import type { Booking, BookingStatus } from '../domain/booking'

export interface ServiceSnapshot {
  id: string
  name: string
  price: number
  durationMinutes: number
}

export interface BookingRepository {
  findById(id: string): Promise<Booking | null>
  findByCustomer(customerId: string, options?: { limit?: number; offset?: number }): Promise<Booking[]>
  findByDate(date: string): Promise<Booking[]>
  findUpcoming(fromDate: string, limit?: number): Promise<Booking[]>
  findOverlapping(params: {
    appointmentDate: string
    appointmentTime: string
    durationMinutes: number
    staffId?: string | null
    excludeBookingId?: string
  }): Promise<Booking | null>
  create(booking: Booking): Promise<Booking>
  update(id: string, changes: BookingUpdate): Promise<Booking>
  delete(id: string): Promise<void>
}

export interface ServiceRepository {
  findById(id: string): Promise<ServiceSnapshot | null>
}

export interface BusinessHours {
  dayOfWeek: number
  isOpen: boolean
  openTime: string | null
  closeTime: string | null
}

export interface BusinessHoursProvider {
  getForDate(date: string): Promise<BusinessHours>
}

export interface BookingClock {
  now(): string
}

export interface BookingIdGenerator {
  generate(): string
}

export interface BookingUpdate {
  status?: BookingStatus
  notes?: string | null
  staffId?: string | null
  eventDate?: string | null
  updatedAt?: string
}

export interface AvailabilityInput {
  serviceId: string
  date: string
  staffId?: string | null
}

export interface AvailabilityResult {
  date: string
  serviceId: string
  durationMinutes: number
  slots: string[]
}
