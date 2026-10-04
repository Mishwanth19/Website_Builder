import type { Clock } from '../../../infrastructure/clock/system-clock'
import type { Payment, PaymentStatus } from '../domain/payment'
export interface PaymentRepository {
  findById(id: string): Promise<Payment | null>
  findByBookingId(bookingId: string): Promise<Payment[]>
  findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null>
  create(payment: Payment): Promise<Payment>
  update(id: string, updates: Partial<Pick<Payment, 'status' | 'providerPaymentId' | 'providerName' | 'metadata'>> & { updatedAt: Date }): Promise<Payment | null>
  delete(id: string): Promise<boolean>
}
export interface CreatePaymentProviderInput { amount: number; currency: string; description?: string; metadata?: Record<string, unknown> }
export interface PaymentIntent { providerPaymentId: string; amount: number; currency: string; status: PaymentStatus; clientSecret?: string }
export interface VerifyPaymentInput { providerPaymentId: string; amount?: number }
export interface PaymentResult { success: boolean; status: PaymentStatus; paymentId: string }
export interface PaymentProvider {
  name: string
  createPayment(input: CreatePaymentProviderInput): Promise<PaymentIntent>
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentResult>
}
export type PaymentClock = Clock
export interface PaymentIdGenerator { generate(): string }
export type { Payment, PaymentStatus }
