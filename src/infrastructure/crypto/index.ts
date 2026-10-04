export class CryptoService {
  private readonly iterations = 100_000
  private readonly keyLengthBits = 256

  async hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const hash = await this.pbkdf2(password, salt, this.iterations)
    return `pbkdf2$${this.iterations}$${this.toHex(salt)}$${this.toHex(hash)}`
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const parts = stored.split('$')
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false
    }

    const iterations = Number(parts[1])
    const salt = this.fromHex(parts[2])
    const expected = this.fromHex(parts[3])
    const actual = await this.pbkdf2(password, salt, iterations)
    return this.timingSafeEqual(actual, expected)
  }

  generateToken(length: number = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return this.toHex(array)
  }

  generateOTP(length: number = 6): string {
    const max = 10 ** length
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)
    return String(values[0] % max).padStart(length, '0')
  }

  async verifyHMAC(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify']
      )

      return crypto.subtle.verify(
        'HMAC',
        key,
        this.fromHex(signature),
        encoder.encode(payload)
      )
    } catch {
      return false
    }
  }

  private async pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      keyMaterial,
      this.keyLengthBits
    )
    return new Uint8Array(bits)
  }

  private timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i]
    }
    return diff === 0
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }

  private fromHex(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    }
    return bytes
  }
}

export const cryptoService = new CryptoService()
