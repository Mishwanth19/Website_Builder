import {
  BookingEntity,
  BookingValidationError,
  type Booking,
  type BookingStatus,
} from '../domain/booking'
import type {
  AvailabilityInput,
  AvailabilityResult,
  BookingClock,
  BookingIdGenerator,
  BookingRepository,
  BookingUpdate,
  ServiceRepository,
} from './ports'
import { AvailabilityService } from './availability-service'

export interface CreateBookingInput {
  customerId: string
  serviceId: string
  appointmentDate: string
  appointmentTime: string
  eventDate?: string | null
  notes?: string | null
  staffId?: string | null
}

export class BookingConflictError extends Error {
  readonly code = 'BOOKING_CONFLICT'

  constructor() {
    super('The requested appointment time is no longer available')
    this.name = 'BookingConflictError'
  }
}

export class BookingNotFoundError extends Error {
  readonly code = 'BOOKING_NOT_FOUND'

  constructor(id: string) {
    super(`Booking not found: ${id}`)
    this.name = 'BookingNotFoundError'
  }
}

export class BookingService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly services: ServiceRepository,
    private readonly availability: AvailabilityService,
    private readonly clock: BookingClock,
    private readonly ids: BookingIdGenerator,
  ) {}

  getById(id: string): Promise<Booking | null> {
    return this.bookings.findById(id)
  }

  findByCustomer(customerId: string, options?: { limit?: number; offset?: number }): Promise<Booking[]> {
    return this.bookings.findByCustomer(customerId, options)
  }

  findByDate(date: string): Promise<Booking[]> {
    return this.bookings.findByDate(date)
  }

  findUpcoming(fromDate: string, limit?: number): Promise<Booking[]> {
    return this.bookings.findUpcoming(fromDate, limit)
  }

  getAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    return this.availability.getAvailability(input)
  }

  async create(input: CreateBookingInput): Promise<Booking> {
    if (!input.customerId?.trim()) throw new BookingValidationError('Customer id is required')
    if (!input.serviceId?.trim()) throw new BookingValidationError('Service id is required')

    const service = await this.services.findById(input.serviceId)
    if (!service) throw new BookingValidationError('Service not found')

    const now = this.clock.now()
    const booking = new BookingEntity({
      id: this.ids.generate(),
      customerId: input.customerId,
      serviceId: input.serviceId,
      eventDate: input.eventDate ?? null,
      appointmentDate: input.appointmentDate,
      appointmentTime: input.appointmentTime,
      status: 'pending',
      notes: input.notes ?? null,
      priceAtBooking: service.price,
      durationAtBooking: service.durationMinutes,
      staffId: input.staffId ?? null,
      createdAt: now,
      updatedAt: now,
    })

    // This check improves the normal user experience. The repository/database
    // must still enforce the invariant atomically because two requests can race.
    const conflict = await this.bookings.findOverlapping({
      appointmentDate: booking.appointmentDate,
      appointmentTime: booking.appointmentTime,
      durationMinutes: booking.durationAtBooking,
      staffId: booking.staffId,
    })

    if (conflict) throw new BookingConflictError()

    try {
      return await this.bookings.create(booking)
    } catch (error) {
      if (error instanceof Error && error.message === 'BOOKING_CONFLICT') {
        throw new BookingConflictError()
      }
      throw error
    }
  }

  async updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const booking = await this.require(id)
    const updated = new BookingEntity(booking).transitionTo(status, this.clock.now())

    return this.bookings.update(id, {
      status: updated.status,
      updatedAt: updated.updatedAt,
    })
  }

  async update(id: string, changes: BookingUpdate): Promise<Booking> {
    const booking = await this.require(id)
    let status = booking.status

    if (changes.status) {
      status = new BookingEntity(booking).transitionTo(changes.status, this.clock.now()).status
    }

    return this.bookings.update(id, {
      ...changes,
      status,
      updatedAt: this.clock.now(),
    })
  }

  cancel(id: string): Promise<Booking> {
    return this.updateStatus(id, 'cancelled')
  }

  confirm(id: string): Promise<Booking> {
    return this.updateStatus(id, 'confirmed')
  }

  complete(id: string): Promise<Booking> {
    return this.updateStatus(id, 'completed')
  }

  async delete(id: string): Promise<void> {
    await this.require(id)
    await this.bookings.delete(id)
  }

  private async require(id: string): Promise<Booking> {
    const booking = await this.bookings.findById(id)
    if (!booking) throw new BookingNotFoundError(id)
    return booking
  }
}
