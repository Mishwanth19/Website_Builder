import { ServiceService, ListServicesInput, CreateServiceInput, UpdateServiceInput } from './application/service-service'
import type { Service, ServiceRepository, ServiceClock, ServiceIdGenerator } from './application/ports'

export interface ServicesModuleDependencies {
  repository: ServiceRepository
  clock: ServiceClock
  ids: ServiceIdGenerator
}

export interface ServicesModule {
  list(input?: ListServicesInput): Promise<Service[]>
  getById(id: string): Promise<Service>
  create(input: CreateServiceInput): Promise<Service>
  update(id: string, input: UpdateServiceInput): Promise<Service>
  activate(id: string): Promise<Service>
  deactivate(id: string): Promise<Service>
  delete(id: string): Promise<void>
}

export function createServicesModule(dependencies: ServicesModuleDependencies): ServicesModule {
  const service = new ServiceService(
    dependencies.repository,
    dependencies.clock,
    dependencies.ids,
  )

  return {
    list: (input) => service.list(input),
    getById: (id) => service.getById(id),
    create: (input) => service.create(input),
    update: (id, input) => service.update(id, input),
    activate: (id) => service.activate(id),
    deactivate: (id) => service.deactivate(id),
    delete: (id) => service.delete(id),
  }
}

export type {
  Service,
  ServiceRepository,
  ServiceClock,
  ServiceIdGenerator,
} from './application/ports'

export { ServiceEntity } from './domain/service'
export { ServiceNotFoundError, ServiceValidationError } from './application/service-service'

