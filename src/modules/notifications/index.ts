import { D1Database } from '@cloudflare/workers-types'
import {
  NotificationService,
  SendNotificationInput,
  ProcessPendingResult,
} from './application/notification-service'
import {
  NotificationClock,
  NotificationIdGenerator,
  NotificationProvider,
  NotificationRepository,
  NotificationRetryPolicy,
} from './application/ports'
import { D1NotificationRepository } from './infrastructure/notification-repository'
import { NotificationEntity } from './domain/notification'

export interface NotificationsModule {
  send(input: SendNotificationInput): Promise<NotificationEntity>
  processPending(limit?: number): Promise<ProcessPendingResult>
}

export interface NotificationsModuleDependencies {
  repository: NotificationRepository
  provider: NotificationProvider
  clock: NotificationClock
  idGenerator: NotificationIdGenerator
  retryPolicy: NotificationRetryPolicy
}

/**
 * Public composition function. The module itself does not require Cloudflare;
 * the D1 adapter below is only a convenience for the Cloudflare composition root.
 */
export function createNotificationsModule(
  dependencies: NotificationsModuleDependencies,
): NotificationsModule {
  const service = new NotificationService(
    dependencies.repository,
    dependencies.provider,
    dependencies.clock,
    dependencies.idGenerator,
    dependencies.retryPolicy,
  )

  return {
    send: (input) => service.send(input),
    processPending: (limit) => service.processPending(limit),
  }
}

/**
 * Cloudflare-specific adapter composition. Keep this out of business logic and
 * call it from the application's composition root.
 */
export function createD1NotificationsModule(
  db: D1Database,
  provider: NotificationProvider,
  dependencies: Omit<NotificationsModuleDependencies, 'repository' | 'provider'>,
): NotificationsModule {
  return createNotificationsModule({
    repository: new D1NotificationRepository(db),
    provider,
    ...dependencies,
  })
}
