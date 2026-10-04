import type { NotificationProvider, NotificationInput, NotificationResult } from './notification-provider'
import { logger } from '../../shared/logging'

export class ConsoleNotificationProvider implements NotificationProvider {
  async send(input: NotificationInput): Promise<NotificationResult> {
    logger.info('Sending notification', {
      recipient: input.recipient, channel: input.channel, type: input.type,
    })
    console.log(`[${input.channel}] To: ${input.recipient}`)
    console.log(`Message: ${input.content}`)
    return { success: true, providerMessageId: `console-${crypto.randomUUID()}` }
  }
}
