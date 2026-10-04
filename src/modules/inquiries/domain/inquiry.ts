export type InquiryStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'closed'
export interface Inquiry {
  id: string; name: string; phone: string; email?: string; serviceId?: string; eventDate?: string
  status: InquiryStatus; notes?: string; createdAt: Date; updatedAt: Date
}
export class InquiryEntity implements Inquiry {
  id!: string; name!: string; phone!: string; email?: string; serviceId?: string; eventDate?: string
  status!: InquiryStatus; notes?: string; createdAt!: Date; updatedAt!: Date
  constructor(data: Inquiry) { Object.assign(this, data) }
  validate(): void {
    if (!this.name.trim()) throw new Error('Inquiry name is required')
    if (!this.phone.trim()) throw new Error('Inquiry phone is required')
  }
  transitionTo(newStatus: InquiryStatus, clock: { now(): Date }): void {
    const transitions: Record<InquiryStatus, InquiryStatus[]> = {
      new: ['contacted', 'qualified', 'closed'], contacted: ['qualified', 'converted', 'closed'],
      qualified: ['converted', 'closed'], converted: ['closed'], closed: [],
    }
    if (!transitions[this.status].includes(newStatus)) throw new Error(`Cannot transition from ${this.status} to ${newStatus}`)
    this.status = newStatus; this.updatedAt = clock.now()
  }
}
