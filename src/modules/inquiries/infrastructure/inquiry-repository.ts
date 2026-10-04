import type { D1Database } from '@cloudflare/workers-types'
import type { Inquiry, InquiryRepository, InquiryStatus } from '../application/ports'

interface InquiryRow {
  id: string; name: string; phone: string; email: string | null; service_id: string | null
  event_date: string | null; status: string; notes: string | null; created_at: string; updated_at: string
}

export class D1InquiryRepository implements InquiryRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Inquiry | null> {
    const row = await this.db.prepare('SELECT * FROM inquiries WHERE id = ?').bind(id).first<InquiryRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByStatus(status: InquiryStatus, limit = 50): Promise<Inquiry[]> {
    const safe = Math.min(Math.max(Math.trunc(limit), 1), 100)
    const result = await this.db.prepare('SELECT * FROM inquiries WHERE status = ? ORDER BY created_at DESC LIMIT ?').bind(status, safe).all<InquiryRow>()
    return (result.results ?? []).map(row => this.rowToEntity(row))
  }
  async findAll(limit = 50): Promise<Inquiry[]> {
    const safe = Math.min(Math.max(Math.trunc(limit), 1), 100)
    const result = await this.db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT ?').bind(safe).all<InquiryRow>()
    return (result.results ?? []).map(row => this.rowToEntity(row))
  }
  async create(inquiry: Inquiry): Promise<Inquiry> {
    await this.db.prepare(
      `INSERT INTO inquiries (id, name, phone, email, service_id, event_date, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      inquiry.id, inquiry.name, inquiry.phone, inquiry.email ?? null, inquiry.serviceId ?? null,
      inquiry.eventDate ?? null, inquiry.status, inquiry.notes ?? null,
      inquiry.createdAt.toISOString(), inquiry.updatedAt.toISOString(),
    ).run()
    return inquiry
  }
  async update(id: string, updates: Partial<Pick<Inquiry, 'status' | 'notes'>> & { updatedAt: Date }): Promise<Inquiry | null> {
    const fields: string[] = []; const values: unknown[] = []
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status) }
    if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes) }
    fields.push('updated_at = ?'); values.push(updates.updatedAt.toISOString()); values.push(id)
    await this.db.prepare(`UPDATE inquiries SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return this.findById(id)
  }
  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM inquiries WHERE id = ?').bind(id).run()
    return (result.meta?.changes ?? 0) > 0
  }
  private rowToEntity(row: InquiryRow): Inquiry {
    return {
      id: row.id, name: row.name, phone: row.phone, email: row.email ?? undefined,
      serviceId: row.service_id ?? undefined, eventDate: row.event_date ?? undefined,
      status: row.status as InquiryStatus, notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    }
  }
}
