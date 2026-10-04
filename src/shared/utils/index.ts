export function generateId(): string {
  return crypto.randomUUID()
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ')
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency
  }).format(amount)
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) {
    return 'Invalid date'
  }

  return d.toLocaleDateString('en-IN', {
    dateStyle: format
  })
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  return d > new Date()
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours, minutes }
}

export function formatTime(time: string): string {
  const { hours, minutes } = parseTime(time)
  const ampm = hours < 12 ? 'AM' : 'PM'
  const hour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
  return `${String(hour).padStart(2, '0')}.${String(minutes).padStart(2, '0')} ${ampm}`
}
