import { AuthService, LoginInput, RequestVerificationInput, VerifyCodeInput } from './application/auth-service'
import type {
  SessionRepository,
  VerificationRepository,
  PasswordHasher,
  TokenGenerator,
  OtpGenerator,
  AuthClock,
  SessionIdGenerator,
  VerificationIdGenerator,
  AdminCredentials,
  OtpSender,
} from './application/ports'

export interface AuthModuleDependencies {
  sessionRepository: SessionRepository
  verificationRepository: VerificationRepository
  adminCredentials: AdminCredentials
  passwordHasher: PasswordHasher
  tokenGenerator: TokenGenerator
  otpGenerator: OtpGenerator
  clock: AuthClock
  sessionIds: SessionIdGenerator
  verificationIds: VerificationIdGenerator
  otpSender?: OtpSender
}

export interface AuthModule {
  login(input: LoginInput): Promise<{ token: string; userId: string; userType: string }>
  verifySession(token: string): Promise<{ userId: string; userType: string } | null>
  logout(token: string): Promise<void>
  requestVerification(input: RequestVerificationInput): Promise<void>
  verifyCode(input: VerifyCodeInput): Promise<{ userId: string; verified: boolean }>
  createCustomerSession(userId: string): Promise<string>
  cleanupExpired(): Promise<void>
}

export function createAuthModule(dependencies: AuthModuleDependencies): AuthModule {
  const authService = new AuthService(
    dependencies.sessionRepository,
    dependencies.verificationRepository,
    dependencies.adminCredentials,
    dependencies.passwordHasher,
    dependencies.tokenGenerator,
    dependencies.otpGenerator,
    dependencies.clock,
    dependencies.sessionIds,
    dependencies.verificationIds,
    dependencies.otpSender,
  )

  return {
    login: (input) => authService.login(input),
    verifySession: (token) => authService.verifySession(token),
    logout: (token) => authService.logout(token),
    requestVerification: (input) => authService.requestVerification(input),
    verifyCode: (input) => authService.verifyCode(input),
    createCustomerSession: (userId) => authService.createCustomerSession(userId),
    cleanupExpired: () => authService.cleanupExpired(),
  }
}

export type {
  SessionRepository,
  VerificationRepository,
  PasswordHasher,
  TokenGenerator,
  OtpGenerator,
  AuthClock,
  SessionIdGenerator,
  VerificationIdGenerator,
  AdminCredentials,
  OtpSender,
} from './application/ports'

export { SessionEntity } from './domain/session'
export {
  AuthenticationError,
  InvalidCredentialsError,
  SessionExpiredError,
  VerificationExpiredError,
  TooManyVerificationAttemptsError,
} from './application/auth-service'

