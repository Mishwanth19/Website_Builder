import type { D1Database } from '@cloudflare/workers-types'
import type { VerificationChallenge, VerificationRepository } from '../application/ports'

interface VerificationRow {
  id: string; user_id: string; type: string; identifier: string; code: string; expires_at: string
  attempts: number; verified: number; created_at: string; updated_at: string
}

export class D1VerificationRepository implements VerificationRepository {
  constructor(private readonly db: D1Database) {}

  async findById(id: string): Promise<VerificationChallenge | null> {
    const row = await this.db.prepare('SELECT * FROM verification_challenges WHERE id = ?').bind(id).first<VerificationRow>()
    return row ? this.rowToEntity(row) : null
  }
  async findByIdentifier(identifier: string): Promise<VerificationChallenge | null> {
    const row = await this.db.prepare(
      'SELECT * FROM verification_challenges WHERE identifier = ? ORDER BY created_at DESC LIMIT 1',
    ).bind(identifier).first<VerificationRow>()
    return row ? this.rowToEntity(row) : null
  }
  async create(challenge: VerificationChallenge): Promise<VerificationChallenge> {
    await this.db.prepare(
      `INSERT INTO verification_challenges
       (id, user_id, type, identifier, code, expires_at, attempts, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      challenge.id, challenge.userId, challenge.type, challenge.identifier, challenge.code,
      challenge.expiresAt.toISOString(), challenge.attempts, challenge.verified ? 1 : 0,
      challenge.createdAt.toISOString(), challenge.updatedAt.toISOString(),
    ).run()
    return challenge
  }
  async incrementAttempts(id: string, now: Date): Promise<void> {
    await this.db.prepare('UPDATE verification_challenges SET attempts = attempts + 1, updated_at = ? WHERE id = ?').bind(now.toISOString(), id).run()
  }
  async markVerified(id: string, now: Date): Promise<void> {
    await this.db.prepare('UPDATE verification_challenges SET verified = 1, updated_at = ? WHERE id = ?').bind(now.toISOString(), id).run()
  }
  async deleteExpired(now: Date): Promise<number> {
    const result = await this.db.prepare('DELETE FROM verification_challenges WHERE expires_at < ?').bind(now.toISOString()).run()
    return result.meta?.changes ?? 0
  }
  private rowToEntity(row: VerificationRow): VerificationChallenge {
    return {
      id: row.id, userId: row.user_id, type: row.type as 'email' | 'phone',
      identifier: row.identifier, code: row.code, expiresAt: new Date(row.expires_at),
      attempts: row.attempts, verified: row.verified === 1,
      createdAt: new Date(row.created_at), updatedAt: new Date(row.updated_at),
    }
  }
}
