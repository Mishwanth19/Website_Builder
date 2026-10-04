export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'cancelled'
export interface Payment {
  id: string; bookingId?: string; amount: number; currency: string; status: PaymentStatus
  providerPaymentId?: string; providerName?: string; metadata?: Record<string, unknown>
  createdAt: Date; updatedAt: Date
}
export class PaymentEntity implements Payment {
  id!: string; bookingId?: string; amount!: number; currency!: string; status!: PaymentStatus
  providerPaymentId?: string; providerName?: string; metadata?: Record<string, unknown>
  createdAt!: Date; updatedAt!: Date
  constructor(data: Payment) { Object.assign(this, data) }
  validate(): void {
    if (this.amount <= 0) throw new Error('Payment amount must be positive')
    if (!this.currency.trim()) throw new Error('Currency is required')
  }
  transitionTo(newStatus: PaymentStatus, clock: { now(): Date }): PaymentEntity {
    const transitions: Record<PaymentStatus, PaymentStatus[]> = {
      pending: ['authorized', 'paid', 'failed', 'cancelled'], authorized: ['paid', 'failed', 'cancelled'],
      paid: ['refunded'], failed: [], refunded: [], cancelled: [],
    }
    if (!transitions[this.status].includes(newStatus)) throw new Error(`Cannot transition payment from ${this.status} to ${newStatus}`)
    return new PaymentEntity({ ...this, status: newStatus, updatedAt: clock.now() })
  }
}
