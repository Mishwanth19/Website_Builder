export const NOTIFICATION_CHANNELS = ['sms', 'whatsapp', 'email'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const NOTIFICATION_STATUSES = ['pending', 'processing', 'sent', 'failed'] as const
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number]

/**
 * Notification types are intentionally open-ended. The module delivers
 * notifications; feature modules decide which business events they represent.
 */
export type NotificationType = string

export interface NotificationProps {
  id: string
  type: NotificationType
  recipient: string
  channel: NotificationChannel
  status: NotificationStatus
  content: string
  metadata?: Record<string, unknown>
  scheduledFor?: Date
  sentAt?: Date
  providerMessageId?: string
  attemptCount: number
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

export class NotificationEntity implements NotificationProps {
  readonly id: string
  readonly type: NotificationType
  readonly recipient: string
  readonly channel: NotificationChannel
  readonly content: string
  readonly metadata?: Record<string, unknown>
  readonly scheduledFor?: Date
  status: NotificationStatus
  sentAt?: Date
  providerMessageId?: string
  attemptCount: number
  lastError?: string
  createdAt: Date
  updatedAt: Date

  constructor(props: NotificationProps) {
    this.id = props.id
    this.type = props.type
    this.recipient = props.recipient
    this.channel = props.channel
    this.content = props.content
    this.metadata = props.metadata
    this.scheduledFor = props.scheduledFor
    this.status = props.status
    this.sentAt = props.sentAt
    this.providerMessageId = props.providerMessageId
    this.attemptCount = props.attemptCount
    this.lastError = props.lastError
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.validate()
  }

  private validate(): void {
    if (!this.id.trim()) throw new Error('Notification id is required')
    if (!this.type.trim()) throw new Error('Notification type is required')
    if (!this.recipient.trim()) throw new Error('Notification recipient is required')
    if (!NOTIFICATION_CHANNELS.includes(this.channel)) {
      throw new Error(`Unsupported notification channel: ${this.channel}`)
    }
    if (!this.content.trim()) throw new Error('Notification content is required')
    if (!Number.isInteger(this.attemptCount) || this.attemptCount < 0) {
      throw new Error('Notification attempt count must be a non-negative integer')
    }
  }

  canBeSent(now: Date): boolean {
    return (
      this.status === 'pending' &&
      (!this.scheduledFor || this.scheduledFor.getTime() <= now.getTime())
    )
  }

  markProcessing(now: Date): void {
    if (this.status !== 'pending') {
      throw new Error(`Notification ${this.id} cannot enter processing from ${this.status}`)
    }
    this.status = 'processing'
    this.updatedAt = now
  }

  markSent(now: Date, providerMessageId?: string): void {
    if (this.status !== 'processing') {
      throw new Error(`Notification ${this.id} cannot be marked sent from ${this.status}`)
    }
    this.status = 'sent'
    this.sentAt = now
    this.providerMessageId = providerMessageId
    this.lastError = undefined
    this.updatedAt = now
  }

  markFailed(now: Date, error: string): void {
    if (this.status !== 'processing') {
      throw new Error(`Notification ${this.id} cannot be marked failed from ${this.status}`)
    }
    this.status = 'failed'
    this.lastError = error
    this.attemptCount += 1
    this.updatedAt = now
  }
}
