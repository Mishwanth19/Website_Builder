import type { D1Database } from '@cloudflare/workers-types'
import type { Service, ServiceRepository } from '../application/ports'

interface ServiceRow {
  id: string; name: string; price: number; duration: number; description: string | null
  is_active: number; metadata: string | null; created_at: string; updated_at: string
}

export class D1ServiceRepository implements ServiceRepository {
  constructor(private readonly db: D1Database) {}

  async findAll(activeOnly = true): Promise<Service[]> {
    const sql = activeOnly
      ? 'SELECT * FROM services WHERE is_active = 1 ORDER BY name'
      : 'SELECT * FROM services ORDER BY name'
    const result = await this.db.prepare(sql).all<ServiceRow>()
    return (result.results ?? []).map(row => this.rowToEntity(row))
  }

  async findById(id: string): Promise<Service | null> {
    const row = await this.db.prepare('SELECT * FROM services WHERE id = ?').bind(id).first<ServiceRow>()
    return row ? this.rowToEntity(row) : null
  }

  async create(service: Service): Promise<Service> {
    await this.db.prepare(
      `INSERT INTO services
       (id, name, price, duration, description, is_active, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      service.id, service.name, service.price, service.duration, service.description ?? null,
      service.isActive ? 1 : 0, service.metadata ? JSON.stringify(service.metadata) : null,
      service.createdAt.toISOString(), service.updatedAt.toISOString(),
    ).run()
    return service
  }

  async update(id: string, updates: Partial<Pick<Service, 'name' | 'price' | 'duration' | 'description' | 'isActive' | 'metadata'>> & { updatedAt: Date }): Promise<Service | null> {
    const existing = await this.findById(id)
    if (!existing) return null
    const fields: string[] = []
    const values: unknown[] = []
    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price) }
    if (updates.duration !== undefined) { fields.push('duration = ?'); values.push(updates.duration) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0) }
    if (updates.metadata !== undefined) { fields.push('metadata = ?'); values.push(updates.metadata ? JSON.stringify(updates.metadata) : null) }
    fields.push('updated_at = ?'); values.push(updates.updatedAt.toISOString()); values.push(id)
    await this.db.prepare(`UPDATE services SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return this.findById(id)
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM services WHERE id = ?').bind(id).run()
    return (result.meta?.changes ?? 0) > 0
  }

  private rowToEntity(row: ServiceRow): Service {
    let metadata: Record<string, unknown> | undefined
    if (row.metadata) {
      try { metadata = JSON.parse(row.metadata) as Record<string, unknown> } catch { metadata = undefined }
    }
    return {
      id: row.id, name: row.name, price: row.price, duration: row.duration,
      description: row.description ?? undefined, isActive: row.is_active === 1,
      metadata, createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    }
  }
}
