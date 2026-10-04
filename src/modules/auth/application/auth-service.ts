import { SessionEntity } from '../domain/session'
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
} from './ports'

export class AuthenticationError extends Error {
  readonly code = 'AUTHENTICATION_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS'

  constructor() {
    super('Invalid username or password')
    this.name = 'InvalidCredentialsError'
  }
}

export class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED'

  constructor() {
    super('Session has expired')
    this.name = 'SessionExpiredError'
  }
}

export class VerificationExpiredError extends Error {
  readonly code = 'VERIFICATION_EXPIRED'

  constructor() {
    super('Verification code has expired')
    this.name = 'VerificationExpiredError'
  }
}

export class TooManyVerificationAttemptsError extends Error {
  readonly code = 'TOO_MANY_VERIFICATION_ATTEMPTS'

  constructor() {
    super('Too many verification attempts. Please request a new code.')
    this.name = 'TooManyVerificationAttemptsError'
  }
}

export interface LoginInput {
  username: string
  password: string
}

export interface RequestVerificationInput {
  userId: string
  type: 'email' | 'phone'
  identifier: string
}

export interface VerifyCodeInput {
  identifier: string
  code: string
}

export class AuthService {
  private readonly MAX_ATTEMPTS = 3
  private readonly SESSION_DURATION_SECONDS = 24 * 60 * 60
  private readonly VERIFICATION_DURATION_SECONDS = 10 * 60

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly adminCredentials: AdminCredentials,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenGenerator: TokenGenerator,
    private readonly otpGenerator: OtpGenerator,
    private readonly clock: AuthClock,
    private readonly sessionIds: SessionIdGenerator,
    private readonly verificationIds: VerificationIdGenerator,
    private readonly otpSender?: OtpSender,
  ) {}

  async login(input: LoginInput): Promise<{ token: string; userId: string; userType: string }> {
    if (!this.adminCredentials.username || !this.adminCredentials.passwordHash) {
      throw new AuthenticationError('Admin credentials are not configured')
    }

    if (input.username !== this.adminCredentials.username) {
      throw new InvalidCredentialsError()
    }

    const matches = await this.passwordHasher.verify(
      input.password,
      this.adminCredentials.passwordHash,
    )
    if (!matches) {
      throw new InvalidCredentialsError()
    }

    const token = this.tokenGenerator.generate()
    const now = this.clock.now()
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_SECONDS * 1000)

    const session = await this.sessionRepository.create({
      id: this.sessionIds.generate(),
      userId: 'admin',
      userType: 'admin',
      token,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })

    return {
      token: session.token,
      userId: session.userId,
      userType: session.userType,
    }
  }

  async verifySession(token: string): Promise<{ userId: string; userType: string } | null> {
    const session = await this.sessionRepository.findByToken(token)
    if (!session) return null

    const entity = new SessionEntity(session)
    if (!entity.isValid(this.clock)) {
      await this.sessionRepository.deleteByToken(token)
      return null
    }

    return {
      userId: session.userId,
      userType: session.userType,
    }
  }

  async logout(token: string): Promise<void> {
    await this.sessionRepository.deleteByToken(token)
  }

  async requestVerification(input: RequestVerificationInput): Promise<void> {
    const code = this.otpGenerator.generate()
    const now = this.clock.now()
    const expiresAt = new Date(now.getTime() + this.VERIFICATION_DURATION_SECONDS * 1000)

    await this.verificationRepository.create({
      id: this.verificationIds.generate(),
      userId: input.userId,
      type: input.type,
      identifier: input.identifier,
      code,
      expiresAt,
      attempts: 0,
      verified: false,
      createdAt: now,
      updatedAt: now,
    })

    if (this.otpSender) {
      await this.otpSender.send(input.identifier, code)
    }
  }

  async verifyCode(input: VerifyCodeInput): Promise<{ userId: string; verified: boolean }> {
    const challenge = await this.verificationRepository.findByIdentifier(input.identifier)

    if (!challenge) {
      throw new AuthenticationError('No verification request found')
    }

    if (challenge.verified) {
      throw new AuthenticationError('Already verified')
    }

    if (this.clock.now() > challenge.expiresAt) {
      throw new VerificationExpiredError()
    }

    if (challenge.attempts >= this.MAX_ATTEMPTS) {
      throw new TooManyVerificationAttemptsError()
    }

    if (challenge.code !== input.code) {
      await this.verificationRepository.incrementAttempts(challenge.id, this.clock.now())
      throw new AuthenticationError('Invalid code')
    }

    await this.verificationRepository.markVerified(challenge.id, this.clock.now())

    return {
      userId: challenge.userId,
      verified: true,
    }
  }

  async createCustomerSession(userId: string): Promise<string> {
    const token = this.tokenGenerator.generate()
    const now = this.clock.now()
    const expiresAt = new Date(now.getTime() + this.SESSION_DURATION_SECONDS * 1000)

    await this.sessionRepository.create({
      id: this.sessionIds.generate(),
      userId,
      userType: 'customer',
      token,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })

    return token
  }

  async cleanupExpired(): Promise<void> {
    const now = this.clock.now()
    await this.sessionRepository.deleteExpired(now)
    await this.verificationRepository.deleteExpired(now)
  }
}
