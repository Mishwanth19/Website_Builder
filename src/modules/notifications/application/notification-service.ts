import {
  NotificationEntity,
  NotificationType,
  NotificationChannel,
} from '../domain/notification'
import {
  NotificationClock,
  NotificationIdGenerator,
  NotificationProvider,
  NotificationRepository,
  NotificationRetryPolicy,
} from './ports'

export interface SendNotificationInput {
  type: NotificationType
  recipient: string
  channel: NotificationChannel
  content: string
  metadata?: Record<string, unknown>
  scheduledFor?: Date
}

export interface ProcessPendingResult {
  processed: number
  sent: number
  failed: number
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly provider: NotificationProvider,
    private readonly clock: NotificationClock,
    private readonly idGenerator: NotificationIdGenerator,
    private readonly retryPolicy: NotificationRetryPolicy,
  ) {}

  async send(input: SendNotificationInput): Promise<NotificationEntity> {
    const now = this.clock.now()
    const id = this.idGenerator.generate()

    const notification = await this.repository.create({
      id,
      type: input.type,
      recipient: input.recipient,
      channel: input.channel,
      status: 'pending',
      content: input.content,
      metadata: input.metadata,
      scheduledFor: input.scheduledFor,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    if (notification.canBeSent(now)) {
      return this.process(notification)
    }

    return notification
  }

  /**
   * Claims due notifications atomically and processes only the claimed rows.
   * This is safe for cron runs that overlap or execute concurrently.
   */
  async processPending(limit = 50): Promise<ProcessPendingResult> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error('Notification processing limit must be between 1 and 500')
    }

    const claimed = await this.repository.claimPending(this.clock.now(), limit)
    let sent = 0
    let failed = 0

    for (const notification of claimed) {
      try {
        const result = await this.process(notification)
        if (result.status === 'sent') sent++
        else failed++
      } catch (error) {
        failed++
        console.error(`Unexpected notification processing error for ${notification.id}:`, error)
      }
    }

    return { processed: claimed.length, sent, failed }
  }

  private async process(notification: NotificationEntity): Promise<NotificationEntity> {
    const now = this.clock.now()

    // A newly-created notification is still pending. Claimed notifications
    // are already processing because the repository performed the atomic claim.
    if (notification.status === 'pending') {
      notification.markProcessing(now)
    } else if (notification.status !== 'processing') {
      return notification
    }

    try {
      const result = await this.provider.send({
        notificationId: notification.id,
        recipient: notification.recipient,
        channel: notification.channel,
        content: notification.content,
        type: notification.type,
        metadata: notification.metadata,
        idempotencyKey: notification.id,
      })

      if (result.success) {
        const updated = await this.repository.markSent(
          notification.id,
          this.clock.now(),
          result.providerMessageId,
        )
        if (!updated) throw new Error(`Notification ${notification.id} disappeared after send`)
        return updated
      }

      const error = result.error || 'Notification provider rejected the message'
      return this.fail(notification, error, result.retryable !== false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification provider error'
      return this.fail(notification, message, true)
    }
  }

  private async fail(
    notification: NotificationEntity,
    error: string,
    retryable: boolean,
  ): Promise<NotificationEntity> {
    const now = this.clock.now()
    notification.markFailed(now, error)
    const retryAt = retryable
      ? this.retryPolicy.getRetryAt(notification.attemptCount, now)
      : undefined

    const updated = await this.repository.markFailed(
      notification.id,
      now,
      error,
      retryAt,
    )

    if (!updated) throw new Error(`Notification ${notification.id} disappeared after failure`)
    return updated
  }
}
