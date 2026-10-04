import type { Clock } from '../../../infrastructure/clock/system-clock'
import type { Inquiry, InquiryStatus } from '../domain/inquiry'
export interface InquiryRepository {
  findById(id: string): Promise<Inquiry | null>
  findByStatus(status: InquiryStatus, limit?: number): Promise<Inquiry[]>
  findAll(limit?: number): Promise<Inquiry[]>
  create(inquiry: Inquiry): Promise<Inquiry>
  update(id: string, updates: Partial<Pick<Inquiry, 'status' | 'notes'>> & { updatedAt: Date }): Promise<Inquiry | null>
  delete(id: string): Promise<boolean>
}
export type InquiryClock = Clock
export interface InquiryIdGenerator { generate(): string }
export type { Inquiry, InquiryStatus }
