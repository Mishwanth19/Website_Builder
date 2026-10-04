import { PaymentService, CreatePaymentInput } from './application/payment-service'
import type {
  Payment,
  PaymentStatus,
  PaymentRepository,
  PaymentProvider,
  PaymentClock,
  PaymentIdGenerator,
} from './application/ports'

export interface PaymentsModuleDependencies {
  repository: PaymentRepository
  provider: PaymentProvider | null
  clock: PaymentClock
  ids: PaymentIdGenerator
}

export interface PaymentsModule {
  getById(id: string): Promise<Payment>
  findByBookingId(bookingId: string): Promise<Payment[]>
  create(input: CreatePaymentInput): Promise<Payment>
  updateStatus(id: string, status: PaymentStatus): Promise<Payment>
  verifyPayment(providerPaymentId: string): Promise<Payment>
  delete(id: string): Promise<void>
}

export function createPaymentsModule(dependencies: PaymentsModuleDependencies): PaymentsModule {
  const service = new PaymentService(
    dependencies.repository,
    dependencies.provider,
    dependencies.clock,
    dependencies.ids,
  )

  return {
    getById: (id) => service.getById(id),
    findByBookingId: (bookingId) => service.findByBookingId(bookingId),
    create: (input) => service.create(input),
    updateStatus: (id, status) => service.updateStatus(id, status),
    verifyPayment: (providerPaymentId) => service.verifyPayment(providerPaymentId),
    delete: (id) => service.delete(id),
  }
}

export type {
  Payment,
  PaymentStatus,
  PaymentRepository,
  PaymentProvider,
  PaymentClock,
  PaymentIdGenerator,
} from './application/ports'

export { PaymentEntity } from './domain/payment'
export {
  PaymentNotFoundError,
  InvalidPaymentStateError,
  PaymentValidationError,
} from './application/payment-service'

