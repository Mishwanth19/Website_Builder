import { ServiceEntity } from '../domain/service'
import type { Service, ServiceRepository, ServiceClock, ServiceIdGenerator } from './ports'

export class ServiceNotFoundError extends Error {
  readonly code = 'SERVICE_NOT_FOUND'
  constructor(id: string) {
    super(`Service not found: ${id}`)
    this.name = 'ServiceNotFoundError'
  }
}

export class ServiceValidationError extends Error {
  readonly code = 'SERVICE_VALIDATION_ERROR'
  constructor(message: string) {
    super(message)
    this.name = 'ServiceValidationError'
  }
}

export interface ListServicesInput { activeOnly?: boolean }
export interface CreateServiceInput {
  name: string
  price: number
  duration: number
  description?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
}
export interface UpdateServiceInput {
  name?: string
  price?: number
  duration?: number
  description?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export class ServiceService {
  constructor(
    private readonly repository: ServiceRepository,
    private readonly clock: ServiceClock,
    private readonly ids: ServiceIdGenerator,
  ) {}

  list(input: ListServicesInput = {}): Promise<Service[]> {
    return this.repository.findAll(input.activeOnly !== false)
  }

  async getById(id: string): Promise<Service> {
    const service = await this.repository.findById(id)
    if (!service) throw new ServiceNotFoundError(id)
    return service
  }

  async create(input: CreateServiceInput): Promise<Service> {
    const now = this.clock.now()
    const service = new ServiceEntity({
      id: this.ids.generate(),
      name: input.name,
      price: input.price,
      duration: input.duration,
      description: input.description,
      isActive: input.isActive !== false,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    })
    try { service.validate() } catch (error) {
      throw new ServiceValidationError(error instanceof Error ? error.message : 'Invalid service')
    }
    return this.repository.create(service)
  }

  async update(id: string, input: UpdateServiceInput): Promise<Service> {
    const existing = await this.getById(id)
    const entity = new ServiceEntity(existing)
    if (input.name !== undefined) entity.name = input.name
    if (input.price !== undefined) entity.updatePrice(input.price, this.clock.now())
    if (input.duration !== undefined) entity.updateDuration(input.duration, this.clock.now())
    if (input.description !== undefined) entity.description = input.description
    if (input.isActive !== undefined) entity.isActive = input.isActive
    if (input.metadata !== undefined) entity.metadata = input.metadata
    entity.updatedAt = this.clock.now()
    try { entity.validate() } catch (error) {
      throw new ServiceValidationError(error instanceof Error ? error.message : 'Invalid service')
    }
    const result = await this.repository.update(id, {
      name: entity.name,
      price: entity.price,
      duration: entity.duration,
      description: entity.description,
      isActive: entity.isActive,
      metadata: entity.metadata,
      updatedAt: entity.updatedAt,
    })
    if (!result) throw new ServiceNotFoundError(id)
    return result
  }

  async activate(id: string): Promise<Service> {
    return this.update(id, { isActive: true })
  }

  async deactivate(id: string): Promise<Service> {
    return this.update(id, { isActive: false })
  }

  async delete(id: string): Promise<void> {
    await this.getById(id)
    await this.repository.delete(id)
  }
}
