import { PaymentEntity } from '../domain/payment'
import type { Payment, PaymentStatus, PaymentRepository, PaymentProvider, PaymentClock, PaymentIdGenerator } from './ports'

export class PaymentNotFoundError extends Error {
  readonly code = 'PAYMENT_NOT_FOUND'
  constructor(id: string) { super(`Payment not found: ${id}`); this.name = 'PaymentNotFoundError' }
}
export class InvalidPaymentStateError extends Error {
  readonly code = 'INVALID_PAYMENT_STATE'
  constructor(from: PaymentStatus, to: PaymentStatus) { super(`Cannot transition payment from ${from} to ${to}`); this.name = 'InvalidPaymentStateError' }
}
export class PaymentValidationError extends Error {
  readonly code = 'PAYMENT_VALIDATION_ERROR'
  constructor(message: string) { super(message); this.name = 'PaymentValidationError' }
}
export interface CreatePaymentInput {
  bookingId?: string
  amount: number
  currency: string
  description?: string
  metadata?: Record<string, unknown>
}

export class PaymentService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly provider: PaymentProvider | null,
    private readonly clock: PaymentClock,
    private readonly ids: PaymentIdGenerator,
  ) {}

  async getById(id: string): Promise<Payment> {
    const payment = await this.repository.findById(id)
    if (!payment) throw new PaymentNotFoundError(id)
    return payment
  }
  findByBookingId(bookingId: string) { return this.repository.findByBookingId(bookingId) }

  async create(input: CreatePaymentInput): Promise<Payment> {
    const now = this.clock.now()
    const payment = new PaymentEntity({
      id: this.ids.generate(), bookingId: input.bookingId, amount: input.amount,
      currency: input.currency, status: 'pending', metadata: input.metadata,
      createdAt: now, updatedAt: now,
    })
    try { payment.validate() } catch (error) {
      throw new PaymentValidationError(error instanceof Error ? error.message : 'Invalid payment')
    }

    if (this.provider) {
      const intent = await this.provider.createPayment({
        amount: input.amount, currency: input.currency, description: input.description, metadata: input.metadata,
      })
      payment.providerPaymentId = intent.providerPaymentId
      payment.providerName = this.provider.name
      payment.status = intent.status
    }

    return this.repository.create(payment)
  }

  async updateStatus(id: string, newStatus: PaymentStatus): Promise<Payment> {
    const payment = await this.getById(id)
    let entity: PaymentEntity
    try { entity = new PaymentEntity(payment).transitionTo(newStatus, this.clock) }
    catch { throw new InvalidPaymentStateError(payment.status, newStatus) }
    const result = await this.repository.update(id, { status: entity.status, updatedAt: entity.updatedAt })
    if (!result) throw new PaymentNotFoundError(id)
    return result
  }

  async verifyPayment(providerPaymentId: string): Promise<Payment> {
    if (!this.provider) throw new Error('Payment provider not configured')
    const payment = await this.repository.findByProviderPaymentId(providerPaymentId)
    if (!payment) throw new PaymentNotFoundError(providerPaymentId)
    const result = await this.provider.verifyPayment({ providerPaymentId })
    return this.updateStatus(payment.id, result.success ? result.status : 'failed')
  }

  async delete(id: string): Promise<void> {
    await this.getById(id)
    await this.repository.delete(id)
  }
}
