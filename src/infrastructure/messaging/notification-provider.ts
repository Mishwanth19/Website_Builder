import type {
  NotificationProvider as NotificationProviderPort,
  ProviderSendInput,
  ProviderSendResult,
} from '../../modules/notifications/application/ports'

export type NotificationInput = ProviderSendInput
export type NotificationResult = ProviderSendResult
export type NotificationProvider = NotificationProviderPort
