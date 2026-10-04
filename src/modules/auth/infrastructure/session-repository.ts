import type { D1Database } from '@cloudflare/workers-types'
import type { Session, SessionRepository, UserType } from '../application/ports'

interface SessionRow {
  id: string; user_id: string; user_type: string; token: string; expires_at: string; created_at: string; updated_at: string
}

export class D1SessionRepository implements SessionRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<Session | null> {
    const row = await this.db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first<SessionRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByToken(token: string): Promise<Session | null> {
    const tokenHash = await hashToken(token)
    const row = await this.db.prepare('SELECT * FROM sessions WHERE token = ?').bind(tokenHash).first<SessionRow>()
    if (!row) return null
    return { ...this.rowToEntity(row), token }
  }
  async findByUserId(userId: string): Promise<Session[]> {
    const result = await this.db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all<SessionRow>()
    return (result.results ?? []).map(row => this.rowToEntity(row))
  }
  async create(session: Session): Promise<Session> {
    await this.db.prepare(
      `INSERT INTO sessions (id, user_id, user_type, token, expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      session.id, session.userId, session.userType, await hashToken(session.token),
      session.expiresAt.toISOString(), session.createdAt.toISOString(), session.updatedAt.toISOString(),
    ).run()
    return session
  }
  async delete(id: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run()
    return (result.meta?.changes ?? 0) > 0
  }
  async deleteByToken(token: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM sessions WHERE token = ?').bind(await hashToken(token)).run()
    return (result.meta?.changes ?? 0) > 0
  }
  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
    return result.meta?.changes ?? 0
  }
  async deleteExpired(now: Date): Promise<number> {
    const result = await this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now.toISOString()).run()
    return result.meta?.changes ?? 0
  }
  private rowToEntity(row: SessionRow): Session {
    return {
      id: row.id, userId: row.user_id, userType: row.user_type as UserType, token: row.token,
      expiresAt: new Date(row.expires_at), createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    }
  }
}


async function hashToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
}
