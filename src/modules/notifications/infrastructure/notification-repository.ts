import { D1Database } from '@cloudflare/workers-types'
import { BaseRepository } from '../../../infrastructure/database/repository'
import {
  NotificationChannel,
  NotificationEntity,
  NotificationStatus,
  NotificationType,
} from '../domain/notification'
import {
  CreateNotificationRecord,
  NotificationRepository as NotificationRepositoryPort,
} from '../application/ports'

interface NotificationRow {
  id: string
  type: string
  recipient: string
  channel: string
  status: string
  content: string
  metadata: string | null
  scheduled_for: string | null
  sent_at: string | null
  provider_message_id: string | null
  attempt_count: number
  last_error: string | null
  retry_at: string | null
  created_at: string
  updated_at: string
}

export class D1NotificationRepository
  extends BaseRepository
  implements NotificationRepositoryPort {
  constructor(db: D1Database) {
    super(db)
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    const row = await this.queryFirst<NotificationRow>(
      'SELECT * FROM notifications WHERE id = ?',
      [id],
    )
    return row ? this.rowToEntity(row) : null
  }

  async findByStatus(
    status: NotificationStatus,
    limit = 50,
  ): Promise<NotificationEntity[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500)
    const result = await this.query<NotificationRow>(
      `SELECT * FROM notifications
       WHERE status = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [status, safeLimit],
    )
    return result.results.map((row) => this.rowToEntity(row))
  }

  async claimPending(now: Date, limit: number): Promise<NotificationEntity[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500)
    const candidates = await this.query<{ id: string }>(
      `SELECT id FROM notifications
       WHERE status = 'pending'
       AND (scheduled_for IS NULL OR scheduled_for <= ?)
       AND (retry_at IS NULL OR retry_at <= ?)
       ORDER BY created_at ASC
       LIMIT ?`,
      [now.toISOString(), now.toISOString(), safeLimit],
    )

    const claimed: NotificationEntity[] = []

    for (const candidate of candidates.results) {
      const result = await this.execute(
        `UPDATE notifications
         SET status = 'processing', updated_at = ?
         WHERE id = ?
           AND status = 'pending'
           AND (scheduled_for IS NULL OR scheduled_for <= ?)
           AND (retry_at IS NULL OR retry_at <= ?)`,
        [now.toISOString(), candidate.id, now.toISOString(), now.toISOString()],
      )

      if ((result.meta?.changes ?? 0) !== 1) continue

      const notification = await this.findById(candidate.id)
      if (notification) claimed.push(notification)
    }

    return claimed
  }

  async create(input: CreateNotificationRecord): Promise<NotificationEntity> {
    await this.execute(
      `INSERT INTO notifications
       (id, type, recipient, channel, status, content, metadata,
        scheduled_for, sent_at, provider_message_id, attempt_count,
        last_error, retry_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, NULL, NULL, ?, ?)`,
      [
        input.id,
        input.type,
        input.recipient,
        input.channel,
        input.status,
        input.content,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.scheduledFor?.toISOString() || null,
        input.attemptCount,
        input.createdAt.toISOString(),
        input.updatedAt.toISOString(),
      ],
    )

    const created = await this.findById(input.id)
    if (!created) throw new Error(`Notification ${input.id} was not persisted`)
    return created
  }

  async markSent(
    id: string,
    now: Date,
    providerMessageId?: string,
  ): Promise<NotificationEntity | null> {
    await this.execute(
      `UPDATE notifications
       SET status = 'sent',
           sent_at = ?,
           provider_message_id = ?,
           last_error = NULL,
           retry_at = NULL,
           updated_at = ?
       WHERE id = ? AND status = 'processing'`,
      [now.toISOString(), providerMessageId || null, now.toISOString(), id],
    )
    return this.findById(id)
  }

  async markFailed(
    id: string,
    now: Date,
    error: string,
    retryAt?: Date,
  ): Promise<NotificationEntity | null> {
    const nextStatus = retryAt ? 'pending' : 'failed'

    await this.execute(
      `UPDATE notifications
       SET status = ?,
           attempt_count = attempt_count + 1,
           last_error = ?,
           retry_at = ?,
           updated_at = ?
       WHERE id = ? AND status = 'processing'`,
      [
        nextStatus,
        error,
        retryAt?.toISOString() || null,
        now.toISOString(),
        id,
      ],
    )
    return this.findById(id)
  }

  private rowToEntity(row: NotificationRow): NotificationEntity {
    const metadata = this.parseMetadata(row.metadata)

    return new NotificationEntity({
      id: row.id,
      type: row.type as NotificationType,
      recipient: row.recipient,
      channel: row.channel as NotificationChannel,
      status: row.status as NotificationStatus,
      content: row.content,
      metadata,
      scheduledFor: row.scheduled_for ? new Date(row.scheduled_for) : undefined,
      sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
      providerMessageId: row.provider_message_id || undefined,
      attemptCount: Number(row.attempt_count || 0),
      lastError: row.last_error || undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  }

  private parseMetadata(value: string | null): Record<string, unknown> | undefined {
    if (!value) return undefined
    try {
      const parsed: unknown = JSON.parse(value)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
      return parsed as Record<string, unknown>
    } catch {
      return undefined
    }
  }
}
