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
    const phoneRegex = /^\+?[\d\s\-]{10,15}$/
    if (!phoneRegex.test(value)) {
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
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      throw new ValidationError('Invalid date')
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
