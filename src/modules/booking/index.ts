import { AvailabilityService, type AvailabilityConfig } from './application/availability-service'
import { BookingService } from './application/booking-service'
import type {
  AvailabilityInput,
  AvailabilityResult,
  BookingClock,
  BookingIdGenerator,
  BookingRepository,
  BusinessHoursProvider,
  BookingUpdate,
  ServiceRepository,
} from './application/ports'
import type { Booking, BookingStatus } from './domain/booking'

export interface BookingModuleDependencies {
  bookings: BookingRepository
  services: ServiceRepository
  businessHours: BusinessHoursProvider
  clock: BookingClock
  ids: BookingIdGenerator
  availability?: AvailabilityConfig
}

export interface BookingModule {
  getById(id: string): Promise<Booking | null>
  findByCustomer(customerId: string, options?: { limit?: number; offset?: number }): Promise<Booking[]>
  findByDate(date: string): Promise<Booking[]>
  findUpcoming(fromDate: string, limit?: number): Promise<Booking[]>
  getAvailability(input: AvailabilityInput): Promise<AvailabilityResult>
  create(input: {
    customerId: string
    serviceId: string
    appointmentDate: string
    appointmentTime: string
    eventDate?: string | null
    notes?: string | null
    staffId?: string | null
  }): Promise<Booking>
  update(id: string, changes: BookingUpdate): Promise<Booking>
  updateStatus(id: string, status: BookingStatus): Promise<Booking>
  cancel(id: string): Promise<Booking>
  confirm(id: string): Promise<Booking>
  complete(id: string): Promise<Booking>
  delete(id: string): Promise<void>
}

export function createBookingModule(dependencies: BookingModuleDependencies): BookingModule {
  const availability = new AvailabilityService(
    dependencies.bookings,
    dependencies.services,
    dependencies.businessHours,
    dependencies.availability ?? { slotIntervalMinutes: 30 },
  )

  const service = new BookingService(
    dependencies.bookings,
    dependencies.services,
    availability,
    dependencies.clock,
    dependencies.ids,
  )

  return {
    getById: (id) => service.getById(id),
    findByCustomer: (customerId, options) => service.findByCustomer(customerId, options),
    findByDate: (date) => service.findByDate(date),
    findUpcoming: (fromDate, limit) => service.findUpcoming(fromDate, limit),
    getAvailability: (input) => service.getAvailability(input),
    create: (input) => service.create(input),
    update: (id, changes) => service.update(id, changes),
    updateStatus: (id, status) => service.updateStatus(id, status),
    cancel: (id) => service.cancel(id),
    confirm: (id) => service.confirm(id),
    complete: (id) => service.complete(id),
    delete: (id) => service.delete(id),
  }
}

export type {
  AvailabilityInput,
  AvailabilityResult,
  BookingClock,
  BookingIdGenerator,
  BookingRepository,
  BusinessHoursProvider,
  BookingUpdate,
  ServiceRepository,
  ServiceSnapshot,
  BusinessHours,
} from './application/ports'

export {
  BookingEntity,
  BookingValidationError,
  InvalidBookingTransitionError,
  BOOKING_STATUSES,
  calculateEndTime,
  intervalsOverlap,
  isValidDate,
  isValidTime,
  minutesToTime,
  timeToMinutes,
} from './domain/booking'

export type { Booking, BookingStatus } from './domain/booking'
