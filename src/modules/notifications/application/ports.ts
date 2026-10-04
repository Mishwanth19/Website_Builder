import {
  NotificationChannel,
  NotificationEntity,
  NotificationType,
} from '../domain/notification'

export interface NotificationRepository {
  create(input: CreateNotificationRecord): Promise<NotificationEntity>
  findById(id: string): Promise<NotificationEntity | null>
  findByStatus(status: NotificationEntity['status'], limit?: number): Promise<NotificationEntity[]>

  /**
   * Atomically claims due pending notifications for processing.
   * The repository is responsible for ensuring two workers cannot claim the
   * same notification at the same time.
   */
  claimPending(now: Date, limit: number): Promise<NotificationEntity[]>

  markSent(id: string, now: Date, providerMessageId?: string): Promise<NotificationEntity | null>
  markFailed(id: string, now: Date, error: string, retryAt?: Date): Promise<NotificationEntity | null>
}

export interface NotificationProvider {
  send(input: ProviderSendInput): Promise<ProviderSendResult>
}

export interface ProviderSendInput {
  notificationId: string
  recipient: string
  channel: NotificationChannel
  content: string
  type: NotificationType
  metadata?: Record<string, unknown>
  /** Provider adapters should use this as their idempotency key when supported. */
  idempotencyKey: string
}

export interface ProviderSendResult {
  success: boolean
  providerMessageId?: string
  error?: string
  retryable?: boolean
}

export interface NotificationClock {
  now(): Date
}

export interface NotificationIdGenerator {
  generate(): string
}

export interface NotificationRetryPolicy {
  getRetryAt(attemptCount: number, now: Date): Date | undefined
}

export interface CreateNotificationRecord {
  id: string
  type: NotificationType
  recipient: string
  channel: NotificationChannel
  content: string
  metadata?: Record<string, unknown>
  scheduledFor?: Date
  status: 'pending'
  attemptCount: number
  createdAt: Date
  updatedAt: Date
}
