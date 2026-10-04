import type { D1Database } from '@cloudflare/workers-types'
import type { Payment, PaymentRepository, PaymentStatus } from '../application/ports'

interface PaymentRow {
  id: string; booking_id: string | null; amount: number; currency: string; status: string
  provider_payment_id: string | null; provider_name: string | null; metadata: string | null
  created_at: string; updated_at: string
}

export class D1PaymentRepository implements PaymentRepository {
  constructor(private readonly db: D1Database) {}
  async findById(id: string): Promise<Payment | null> {
    const row = await this.db.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first<PaymentRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByBookingId(bookingId: string): Promise<Payment[]> {
    const result = await this.db.prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC').bind(bookingId).all<PaymentRow>()
    return (result.results ?? []).map(row => this.rowToEntity(row))
  }
  async findByProviderPaymentId(providerPaymentId: string): Promise<Payment | null> {
    const row = await this.db.prepare('SELECT * FROM payments WHERE provider_payment_id = ?').bind(providerPaymentId).first<PaymentRow>()
    return row ? this.rowToEntity(row) : null
  }
  async create(payment: Payment): Promise<Payment> {
    await this.db.prepare(
      `INSERT INTO payments
       (id, booking_id, amount, currency, status, provider_payment_id, provider_name, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      payment.id, payment.bookingId ?? null, payment.amount, payment.currency, payment.status,
      payment.providerPaymentId ?? null, payment.providerName ?? null,
      payment.metadata ? JSON.stringify(payment.metadata) : null,
      payment.createdAt.toISOString(), payment.updatedAt.toISOString(),
    ).run()
    return payment
  }
  async update(id: string, updates: Partial<Pick<Payment, 'status' | 'providerPaymentId' | 'providerName' | 'metadata'>> & { updatedAt: Date }): Promise<Payment | null> {
    const fields: string[] = []; const values: unknown[] = []
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.providerPaymentId !== undefined) { fields.push('provider_payment_id = ?'); values.push(updates.providerPaymentId) }
    if (updates.providerName !== undefined) { fields.push('provider_name = ?'); values.push(updates.providerName) }
    if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(updates.metadata ? JSON.stringify(updates.metadata) : null) }
    fields.push('updated_at = ?'); values.push(updates.updatedAt.toISOString()); values.push(id)
    await this.db.prepare(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return this.findById(id)
  }
  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM payments WHERE id = ?').bind(id).run()
    return (result.meta?.changes ?? 0) > 0
  }
  private rowToEntity(row: PaymentRow): Payment {
    let metadata: Record<string, unknown> | undefined
    if (row.metadata) { try { metadata = JSON.parse(row.metadata) as Record<string, unknown> } catch {} }
    return {
      id: row.id, bookingId: row.booking_id ?? undefined, amount: row.amount, currency: row.currency,
      status: row.status as PaymentStatus, providerPaymentId: row.provider_payment_id ?? undefined,
      providerName: row.provider_name ?? undefined, metadata,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    }
  }
}
