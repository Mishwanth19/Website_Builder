import { cryptoService } from './index'
import type { PasswordHasher, TokenGenerator, OtpGenerator } from '../../modules/auth/application/ports'

export class CryptoPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<{ hash: string; salt: string }> {
    const hash = await cryptoService.hashPassword(password)
    return { hash, salt: '' }
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return cryptoService.verifyPassword(password, hash)
  }
}

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return cryptoService.generateToken()
  }
}

export class CryptoOtpGenerator implements OtpGenerator {
  generate(): string {
    return cryptoService.generateOTP()
  }
}

export function createCryptoPasswordHasher(): PasswordHasher {
  return new CryptoPasswordHasher()
}

export function createCryptoTokenGenerator(): TokenGenerator {
  return new CryptoTokenGenerator()
}

export function createCryptoOtpGenerator(): OtpGenerator {
  return new CryptoOtpGenerator()
}
