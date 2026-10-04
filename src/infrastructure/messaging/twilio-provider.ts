import type { NotificationProvider, NotificationInput, NotificationResult } from './notification-provider'
import { logger } from '../../shared/logging'

export interface TwilioConfig { accountSid: string; authToken: string; from: string }

export class TwilioNotificationProvider implements NotificationProvider {
  constructor(private readonly config: TwilioConfig) {}

  async send(input: NotificationInput): Promise<NotificationResult> {
    if (input.channel !== 'sms' && input.channel !== 'whatsapp') {
      return { success: false, error: `Twilio does not support ${input.channel}`, retryable: false }
    }
    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: input.recipient,
            From: this.config.from,
            Body: input.content,
          }),
        },
      )
      const data = await response.json() as { sid?: string; message?: string; code?: number }
      if (!response.ok) {
        logger.error('Twilio notification failed', undefined, { error: data.message, code: data.code })
        return { success: false, error: data.message ?? 'Twilio request failed', retryable: response.status >= 500 }
      }
      return { success: true, providerMessageId: data.sid }
    } catch (error) {
      logger.error('Twilio notification error', error as Error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown provider error', retryable: true }
    }
  }
}
