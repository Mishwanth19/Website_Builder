import { ValidationError } from '../errors'

export interface ValidationRule<T> {
  validate(value: T): void
}

export class Validator<T> {
  private rules: ValidationRule<T>[] = []

  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule)
    return this
  }

  validate(value: T): void {
    for (const rule of this.rules) {
      rule.validate(value)
    }
  }
}

export class RequiredField implements ValidationRule<any> {
  constructor(private readonly fieldName: string) {}

  validate(value: any): void {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(`${this.fieldName} is required`)
    }
  }
}

export class EmailValidator implements ValidationRule<string> {
  validate(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email format')
    }
  }
}

export class PhoneValidator implements ValidationRule<string> {
  validate(value: string): void {
    if (typeof value !== 'string') {
      throw new ValidationError('Invalid phone number format')
    }
    const normalized = value.replace(/[\s-]/g, '')
    const phoneRegex = /^\+?\d{10,15}$/
    if (!phoneRegex.test(normalized)) {
      throw new ValidationError('Invalid phone number format')
    }
  }
}

export class DateValidator implements ValidationRule<string> {
  validate(value: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(value)) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD')
    }
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new ValidationError('Invalid calendar date')
    }
  }
}

export class TimeValidator implements ValidationRule<string> {
  validate(value: string): void {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(value)) {
      throw new ValidationError('Invalid time format. Use HH:MM')
    }
  }
}

export function validateRequired(obj: any, fields: string[]): void {
  const missing = fields.filter(field => !obj[field])
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`)
  }
}


const MAX_JSON_BODY_BYTES = 16 * 1024

/** Parse a small JSON object with a strict size/content-type limit. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    throw new ValidationError('Content-Type must be application/json')
  }

  const declaredLengthHeader = request.headers.get('content-length')
  if (declaredLengthHeader !== null) {
    const declaredLength = Number(declaredLengthHeader)
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > MAX_JSON_BODY_BYTES) {
      throw new ValidationError('Request body is too large')
    }
  }

  if (!request.body) throw new ValidationError('Request body is required')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel()
        throw new ValidationError('Request body is too large')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  let raw: string
  try {
    raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new ValidationError('Request body must be valid UTF-8')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new ValidationError('Malformed JSON body')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ValidationError('Expected a JSON object')
  }
  return parsed as Record<string, unknown>
}

export function requireString(
  value: unknown,
  field: string,
  options: { min?: number; max: number; optional?: boolean }
): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (options.optional) return undefined
    throw new ValidationError(`${field} is required`)
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`)
  const normalized = value.trim()
  if (normalized.length < (options.min ?? 1) || normalized.length > options.max) {
    throw new ValidationError(`${field} must be between ${options.min ?? 1} and ${options.max} characters`)
  }
  return normalized
}
