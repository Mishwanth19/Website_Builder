import type { Clock } from '../../../infrastructure/clock/system-clock'
import type { Service } from '../domain/service'

export interface ServiceRepository {
  findById(id: string): Promise<Service | null>
  findAll(activeOnly?: boolean): Promise<Service[]>
  create(service: Service): Promise<Service>
  update(id: string, updates: Partial<Pick<Service, 'name' | 'price' | 'duration' | 'description' | 'isActive' | 'metadata'>> & { updatedAt: Date }): Promise<Service | null>
  delete(id: string): Promise<boolean>
}
export type ServiceClock = Clock
export interface ServiceIdGenerator { generate(): string }
export type { Service }
