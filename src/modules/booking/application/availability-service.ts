import {
  BookingValidationError,
  calculateEndTime,
  isValidDate,
  isValidTime,
  timeToMinutes,
  minutesToTime,
} from '../domain/booking'
import type {
  AvailabilityInput,
  AvailabilityResult,
  BookingRepository,
  BusinessHoursProvider,
  ServiceRepository,
} from './ports'

export interface AvailabilityConfig {
  slotIntervalMinutes: number
}

export class AvailabilityService {
  constructor(
    private readonly bookings: BookingRepository,
    private readonly services: ServiceRepository,
    private readonly businessHours: BusinessHoursProvider,
    private readonly config: AvailabilityConfig,
  ) {}

  async getAvailability(input: AvailabilityInput): Promise<AvailabilityResult> {
    if (!isValidDate(input.date)) {
      throw new BookingValidationError('Invalid date. Expected YYYY-MM-DD')
    }

    if (!input.serviceId.trim()) {
      throw new BookingValidationError('Service id is required')
    }

    if (!Number.isInteger(this.config.slotIntervalMinutes) || this.config.slotIntervalMinutes <= 0) {
      throw new BookingValidationError('Slot interval must be a positive integer')
    }

    const service = await this.services.findById(input.serviceId)
    if (!service) {
      throw new BookingValidationError('Service not found')
    }

    if (!Number.isInteger(service.durationMinutes) || service.durationMinutes <= 0) {
      throw new BookingValidationError('Service has an invalid duration')
    }

    const hours = await this.businessHours.getForDate(input.date)
    if (!hours.isOpen || !hours.openTime || !hours.closeTime) {
      return {
        date: input.date,
        serviceId: input.serviceId,
        durationMinutes: service.durationMinutes,
        slots: [],
      }
    }

    if (!isValidTime(hours.openTime) || !isValidTime(hours.closeTime)) {
      throw new BookingValidationError('Business hours contain an invalid time')
    }

    const open = timeToMinutes(hours.openTime)
    const close = timeToMinutes(hours.closeTime)

    if (close <= open) {
      throw new BookingValidationError('Business closing time must be after opening time')
    }

    const bookings = await this.bookings.findByDate(input.date)
    const slots: string[] = []

    for (
      let start = open;
      start + service.durationMinutes <= close;
      start += this.config.slotIntervalMinutes
    ) {
      const time = minutesToTime(start)
      const endTime = calculateEndTime(time, service.durationMinutes)

      const conflicts = bookings.some((booking) => {
        if (booking.status === 'cancelled') return false
        if (input.staffId && booking.staffId && booking.staffId !== input.staffId) return false

        const bookingEnd = calculateEndTime(booking.appointmentTime, booking.durationAtBooking)
        return timeToMinutes(time) < timeToMinutes(bookingEnd) &&
          timeToMinutes(booking.appointmentTime) < timeToMinutes(endTime)
      })

      if (!conflicts) slots.push(time)
    }

    return {
      date: input.date,
      serviceId: input.serviceId,
      durationMinutes: service.durationMinutes,
      slots,
    }
  }
}
