import type { D1Database } from '@cloudflare/workers-types'
import type { Customer, CustomerRepository } from '../application/ports'

interface CustomerRow {
  id: string; name: string; phone: string; email: string | null; created_at: string; updated_at: string
}

export class D1CustomerRepository implements CustomerRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Customer | null> {
    const row = await this.db.prepare('SELECT * FROM customers WHERE id = ?').bind(id).first<CustomerRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByPhone(phone: string): Promise<Customer | null> {
    const row = await this.db.prepare('SELECT * FROM customers WHERE phone = ?').bind(phone).first<CustomerRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByEmail(email: string): Promise<Customer | null> {
    const row = await this.db.prepare('SELECT * FROM customers WHERE email = ?').bind(email).first<CustomerRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByPhoneOrEmail(identifier: string): Promise<Customer | null> {
    const row = await this.db.prepare('SELECT * FROM customers WHERE phone = ? OR email = ?').bind(identifier, identifier).first<CustomerRow>()
    return row ? this.rowToEntity(row) : null
  }
  async create(customer: Customer): Promise<Customer> {
    await this.db.prepare(
      `INSERT INTO customers (id, name, phone, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      customer.id, customer.name, customer.phone, customer.email ?? null,
      customer.createdAt.toISOString(), customer.updatedAt.toISOString(),
    ).run()
    return customer
  }
  async update(id: string, updates: Partial<Pick<Customer, 'name' | 'phone' | 'email'>> & { updatedAt: Date }): Promise<Customer | null> {
    if (updates.name === undefined && updates.phone === undefined && updates.email === undefined) return this.findById(id)
    const fields: string[] = []; const values: unknown[] = []
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone) }
    if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email) }
    fields.push('updated_at = ?'); values.push(updates.updatedAt.toISOString()); values.push(id)
    await this.db.prepare(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return this.findById(id)
  }
  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM customers WHERE id = ?').bind(id).run()
    return (result.meta?.changes ?? 0) > 0
  }
  private rowToEntity(row: CustomerRow): Customer {
    return {
      id: row.id, name: row.name, phone: row.phone, email: row.email ?? undefined,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    }
  }
}
