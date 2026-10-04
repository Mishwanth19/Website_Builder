import type { OtpSender } from '../../modules/auth/application/ports'
import type { NotificationProvider } from './notification-provider'

export class NotificationOtpSender implements OtpSender {
  constructor(private readonly provider: NotificationProvider) {}
  async send(identifier: string, code: string): Promise<void> {
    const result = await this.provider.send({
      notificationId: `otp-${crypto.randomUUID()}`,
      recipient: identifier,
      channel: 'sms',
      content: `Your verification code is: ${code}`,
      type: 'otp',
      metadata: { kind: 'otp' },
      idempotencyKey: `otp-${identifier}-${code}`,
    })
    if (!result.success) throw new Error(result.error ?? 'Failed to send verification code')
  }
}

export function createNotificationOtpSender(provider: NotificationProvider): OtpSender {
  return new NotificationOtpSender(provider)
}
