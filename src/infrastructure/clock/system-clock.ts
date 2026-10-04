export interface Clock {
  now(): Date
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

export function createSystemClock(): Clock {
  return new SystemClock()
}
