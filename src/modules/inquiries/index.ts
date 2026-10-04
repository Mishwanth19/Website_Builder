import { InquiryService, CreateInquiryInput, UpdateInquiryInput } from './application/inquiry-service'
import type {
  Inquiry,
  InquiryStatus,
  InquiryRepository,
  InquiryClock,
  InquiryIdGenerator,
} from './application/ports'

export interface InquiriesModuleDependencies {
  repository: InquiryRepository
  clock: InquiryClock
  ids: InquiryIdGenerator
}

export interface InquiriesModule {
  getById(id: string): Promise<Inquiry>
  findByStatus(status: InquiryStatus, limit?: number): Promise<Inquiry[]>
  findAll(limit?: number): Promise<Inquiry[]>
  create(input: CreateInquiryInput): Promise<Inquiry>
  update(id: string, input: UpdateInquiryInput): Promise<Inquiry>
  updateStatus(id: string, status: InquiryStatus): Promise<Inquiry>
  delete(id: string): Promise<void>
}

export function createInquiriesModule(dependencies: InquiriesModuleDependencies): InquiriesModule {
  const service = new InquiryService(
    dependencies.repository,
    dependencies.clock,
    dependencies.ids,
  )

  return {
    getById: (id) => service.getById(id),
    findByStatus: (status, limit) => service.findByStatus(status, limit),
    findAll: (limit) => service.findAll(limit),
    create: (input) => service.create(input),
    update: (id, input) => service.update(id, input),
    updateStatus: (id, status) => service.updateStatus(id, status),
    delete: (id) => service.delete(id),
  }
}

export type {
  Inquiry,
  InquiryStatus,
  InquiryRepository,
  InquiryClock,
  InquiryIdGenerator,
} from './application/ports'

export { InquiryEntity } from './domain/inquiry'
export { InquiryNotFoundError, InvalidInquiryStatusTransitionError } from './application/inquiry-service'

