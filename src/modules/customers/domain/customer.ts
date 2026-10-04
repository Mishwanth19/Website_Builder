export interface Customer {
  id: string; name: string; phone: string; email?: string; createdAt: Date; updatedAt: Date
}
export class CustomerEntity implements Customer {
  id!: string; name!: string; phone!: string; email?: string; createdAt!: Date; updatedAt!: Date
  constructor(data: Customer) { Object.assign(this, data) }
  validate(): void {
    if (!this.name.trim()) throw new Error('Customer name is required')
    if (!this.phone.trim()) throw new Error('Customer phone is required')
    if (!/^\+?[\d\s-]{10,15}$/.test(this.phone.replace(/\s+/g, ''))) throw new Error('Invalid phone number format')
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) throw new Error('Invalid email format')
  }
  updateContact(details: { name?: string; phone?: string; email?: string }, clock: { now(): Date }): void {
    if (details.name !== undefined) this.name = details.name
    if (details.phone !== undefined) this.phone = details.phone
    if (details.email !== undefined) this.email = details.email
    this.updatedAt = clock.now()
  }
}
