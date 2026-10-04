export interface Service {
  id: string; name: string; price: number; duration: number; description?: string
  isActive: boolean; metadata?: Record<string, unknown>; createdAt: Date; updatedAt: Date
}
export class ServiceEntity implements Service {
  id!: string; name!: string; price!: number; duration!: number; description?: string
  isActive!: boolean; metadata?: Record<string, unknown>; createdAt!: Date; updatedAt!: Date
  constructor(data: Service) { Object.assign(this, data) }
  validate(): void {
    if (!this.name.trim()) throw new Error('Service name is required')
    if (this.price < 0) throw new Error('Service price cannot be negative')
    if (!Number.isInteger(this.duration) || this.duration <= 0) throw new Error('Service duration must be positive')
  }
  activate(now: Date): void { this.isActive = true; this.updatedAt = now }
  deactivate(now: Date): void { this.isActive = false; this.updatedAt = now }
  updatePrice(price: number, now: Date): void {
    if (price < 0) throw new Error('Service price cannot be negative')
    this.price = price; this.updatedAt = now
  }
  updateDuration(duration: number, now: Date): void {
    if (!Number.isInteger(duration) || duration <= 0) throw new Error('Service duration must be positive')
    this.duration = duration; this.updatedAt = now
  }
}
