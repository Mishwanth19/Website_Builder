import type { ServiceRepository as BookingServiceRepository, ServiceSnapshot } from '../application/ports'
import type { ServiceRepository } from '../../services/application/ports'

export class ServiceSnapshotAdapter implements BookingServiceRepository {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  async findById(id: string): Promise<ServiceSnapshot | null> {
    const service = await this.serviceRepository.findById(id)
    if (!service) return null

    return {
      id: service.id,
      name: service.name,
      price: service.price,
      durationMinutes: service.duration,
    }
  }
}
