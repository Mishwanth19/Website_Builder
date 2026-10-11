import type { Clock } from '../../../infrastructure/clock/system-clock'
import type { Session, UserType } from '../domain/session'

export interface SessionRepository {
  findById(id: string): Promise<Session | null>
  findByToken(token: string): Promise<Session | null>
  findByUserId(userId: string): Promise<Session[]>
  create(session: Session): Promise<Session>
  delete(id: string): Promise<boolean>
  deleteByToken(token: string): Promise<boolean>
  deleteByUserId(userId: string): Promise<number>
  deleteExpired(now: Date): Promise<number>
}

export interface VerificationChallenge {
  id: string
  userId: string
  type: 'email' | 'phone'
  identifier: string
  code: string
  expiresAt: Date
  attempts: number
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

export interface VerificationRepository {
  findById(id: string): Promise<VerificationChallenge | null>
  findByIdentifier(identifier: string): Promise<VerificationChallenge | null>
  create(challenge: VerificationChallenge): Promise<VerificationChallenge>
  incrementAttempts(id: string, now: Date): Promise<boolean>
  markVerified(id: string, now: Date): Promise<boolean>
  deleteExpired(now: Date): Promise<number>
}

export interface PasswordHasher {
  hash(password: string): Promise<{ hash: string; salt: string }>
  verify(password: string, hash: string): Promise<boolean>
}
export interface TokenGenerator { generate(): string }
export interface OtpGenerator { generate(): string }
export type AuthClock = Clock
export interface SessionIdGenerator { generate(): string }
export interface VerificationIdGenerator { generate(): string }
export interface AdminCredentials { username: string; passwordHash: string }
export interface OtpSender { send(identifier: string, code: string): Promise<void> }

export type { Session, UserType }
