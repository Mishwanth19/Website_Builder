import type { D1Database } from '@cloudflare/workers-types'
import { Env } from '../config/environment'
import { BusinessConfig, DEFAULT_BUSINESS_CONFIG } from '../config/business'
import { FeatureFlags, DEFAULT_FEATURE_FLAGS } from '../config/features'
import { ProviderConfig, DEFAULT_PROVIDER_CONFIG } from '../config/providers'
import { createServicesModule, ServicesModule } from '../modules/services'
import { createCustomersModule, CustomersModule } from '../modules/customers'
import { createBookingModule, BookingModule } from '../modules/booking'
import { createInquiriesModule, InquiriesModule } from '../modules/inquiries'
import { createAuthModule, AuthModule } from '../modules/auth'
import { createD1NotificationsModule, NotificationsModule } from '../modules/notifications'
import { createPaymentsModule, PaymentsModule } from '../modules/payments'
import { createSchedulingModule, SchedulingModule } from '../modules/scheduling'
import { createHealthModule, HealthModule } from '../modules/health'
import { ConsoleNotificationProvider } from '../infrastructure/messaging/console-provider'
import { TwilioNotificationProvider } from '../infrastructure/messaging/twilio-provider'
import { createSystemClock } from '../infrastructure/clock/system-clock'
import { createIdGenerator } from '../infrastructure/id-generator'
import { createCryptoPasswordHasher, createCryptoTokenGenerator, createCryptoOtpGenerator } from '../infrastructure/crypto/crypto-adapter'
import { cryptoService } from '../infrastructure/crypto'
import { createNotificationOtpSender } from '../infrastructure/messaging/notification-adapter'
import { D1ServiceRepository } from '../modules/services/infrastructure/service-repository'
import { D1CustomerRepository } from '../modules/customers/infrastructure/customer-repository'
import { D1BookingRepository } from '../modules/booking/infrastructure/booking-repository'
import { D1InquiryRepository } from '../modules/inquiries/infrastructure/inquiry-repository'
import { D1SessionRepository } from '../modules/auth/infrastructure/session-repository'
import { D1VerificationRepository } from '../modules/auth/infrastructure/verification-repository'
import { D1PaymentRepository } from '../modules/payments/infrastructure/payment-repository'
import { ServiceSnapshotAdapter } from '../modules/booking/infrastructure/service-snapshot-repository'
import { D1BusinessHoursProvider } from '../modules/booking/infrastructure/business-hours-repository'

export interface AppModules {
  services: ServicesModule
  customers: CustomersModule
  bookings: BookingModule
  inquiries: InquiriesModule
  auth: AuthModule
  notifications: NotificationsModule
  payments: PaymentsModule
  scheduler: SchedulingModule
  health: HealthModule
  features: FeatureFlags
  providers: ProviderConfig
  business: BusinessConfig
  timezone: string
}

class FixedRetryPolicy {
  getRetryAt(attemptCount: number, now: Date): Date | undefined {
    if (attemptCount >= 3) return undefined
    return new Date(now.getTime() + Math.min(60 * 60_000, 5 * 60_000 * 2 ** attemptCount))
  }
}

export async function createModules(env: Env): Promise<AppModules> {
  const clock = createSystemClock()
  const ids = createIdGenerator()
  const passwordHasher = createCryptoPasswordHasher()
  const tokenGenerator = createCryptoTokenGenerator()
  const otpGenerator = createCryptoOtpGenerator()

  const notificationProvider =
    env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM
      ? new TwilioNotificationProvider({
          accountSid: env.TWILIO_ACCOUNT_SID,
          authToken: env.TWILIO_AUTH_TOKEN,
          from: env.TWILIO_FROM,
        })
      : new ConsoleNotificationProvider()

  const servicesRepository = new D1ServiceRepository(env.DB)
  const notifications = createD1NotificationsModule(env.DB, notificationProvider, {
    clock,
    idGenerator: ids,
    retryPolicy: new FixedRetryPolicy(),
  })

  const services = createServicesModule({ repository: servicesRepository, clock, ids })
  const customers = createCustomersModule({
    repository: new D1CustomerRepository(env.DB), clock, ids,
  })

  const bookings = createBookingModule({
    bookings: new D1BookingRepository(env.DB),
    services: new ServiceSnapshotAdapter(servicesRepository),
    businessHours: new D1BusinessHoursProvider(env.DB),
    clock: { now: () => clock.now().toISOString() },
    ids,
  })

  const inquiries = createInquiriesModule({
    repository: new D1InquiryRepository(env.DB), clock, ids,
  })

  const passwordHash = env.ADMIN_PASSWORD_HASH ?? (env.ADMIN_PASSWORD ? await cryptoService.hashPassword(env.ADMIN_PASSWORD) : '')
  const auth = createAuthModule({
    sessionRepository: new D1SessionRepository(env.DB),
    verificationRepository: new D1VerificationRepository(env.DB),
    adminCredentials: {
      username: env.ADMIN_USERNAME ?? '',
      passwordHash,
    },
    passwordHasher,
    tokenGenerator,
    otpGenerator,
    clock,
    sessionIds: ids,
    verificationIds: ids,
    otpSender: createNotificationOtpSender(notificationProvider),
  })

  const payments = createPaymentsModule({
    repository: new D1PaymentRepository(env.DB),
    provider: null,
    clock,
    ids,
  })

  const scheduler = createSchedulingModule()
  scheduler.register({
    name: 'notifications',
    execute: () => notifications.processPending(50).then(() => undefined),
  })
  scheduler.register({
    name: 'auth-cleanup',
    execute: () => auth.cleanupExpired(),
  })

  const health = createHealthModule({
    now: () => clock.now(),
    checkDatabase: async () => {
      const result = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
      return result?.ok === 1
    },
  })

  return {
    services, customers, bookings, inquiries, auth, notifications, payments,
    scheduler, health,
    features: DEFAULT_FEATURE_FLAGS,
    providers: DEFAULT_PROVIDER_CONFIG,
    business: { ...DEFAULT_BUSINESS_CONFIG, timezone: env.BUSINESS_TIMEZONE ?? DEFAULT_BUSINESS_CONFIG.timezone },
    timezone: env.BUSINESS_TIMEZONE ?? DEFAULT_BUSINESS_CONFIG.timezone,
  }
}
