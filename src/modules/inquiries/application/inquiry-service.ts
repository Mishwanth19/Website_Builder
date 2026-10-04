import { InquiryEntity } from '../domain/inquiry'
import type { Inquiry, InquiryStatus, InquiryRepository, InquiryClock, InquiryIdGenerator } from './ports'

export class InquiryNotFoundError extends Error {
  readonly code = 'INQUIRY_NOT_FOUND'
  constructor(id: string) { super(`Inquiry not found: ${id}`); this.name = 'InquiryNotFoundError' }
}
export class InvalidInquiryStatusTransitionError extends Error {
  readonly code = 'INVALID_INQUIRY_STATUS_TRANSITION'
  constructor(from: InquiryStatus, to: InquiryStatus) { super(`Cannot transition inquiry from ${from} to ${to}`); this.name = 'InvalidInquiryStatusTransitionError' }
}
export interface CreateInquiryInput {
  name: string; phone: string; email?: string; serviceId?: string; eventDate?: string; notes?: string
}
export interface UpdateInquiryInput { status?: InquiryStatus; notes?: string }

export class InquiryService {
  constructor(private readonly repository: InquiryRepository, private readonly clock: InquiryClock, private readonly ids: InquiryIdGenerator) {}

  async getById(id: string): Promise<Inquiry> {
    const result = await this.repository.findById(id)
    if (!result) throw new InquiryNotFoundError(id)
    return result
  }
  findByStatus(status: InquiryStatus, limit?: number) { return this.repository.findByStatus(status, limit) }
  findAll(limit?: number) { return this.repository.findAll(limit) }

  async create(input: CreateInquiryInput): Promise<Inquiry> {
    const now = this.clock.now()
    const inquiry = new InquiryEntity({
      id: this.ids.generate(), name: input.name, phone: input.phone, email: input.email,
      serviceId: input.serviceId, eventDate: input.eventDate, status: 'new', notes: input.notes,
      createdAt: now, updatedAt: now,
    })
    inquiry.validate()
    return this.repository.create(inquiry)
  }

  async updateStatus(id: string, status: InquiryStatus): Promise<Inquiry> {
    return this.update(id, { status })
  }

  async update(id: string, input: UpdateInquiryInput): Promise<Inquiry> {
    const existing = await this.getById(id)
    const entity = new InquiryEntity(existing)
    try {
      if (input.status) entity.transitionTo(input.status, this.clock)
    } catch {
      throw new InvalidInquiryStatusTransitionError(existing.status, input.status!)
    }
    const result = await this.repository.update(id, {
      ...(input.status ? { status: entity.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: entity.updatedAt,
    })
    if (!result) throw new InquiryNotFoundError(id)
    return result
  }

  async delete(id: string): Promise<void> {
    await this.getById(id)
    await this.repository.delete(id)
  }
}
