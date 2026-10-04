import { CustomerService, CreateCustomerInput, UpdateCustomerInput } from './application/customer-service'
import type { Customer, CustomerRepository, CustomerClock, CustomerIdGenerator } from './application/ports'

export interface CustomersModuleDependencies {
  repository: CustomerRepository
  clock: CustomerClock
  ids: CustomerIdGenerator
}

export interface CustomersModule {
  getById(id: string): Promise<Customer>
  findByPhone(phone: string): Promise<Customer | null>
  findByEmail(email: string): Promise<Customer | null>
  findByPhoneOrEmail(identifier: string): Promise<Customer | null>
  findOrCreate(input: CreateCustomerInput): Promise<Customer>
  create(input: CreateCustomerInput): Promise<Customer>
  update(id: string, input: UpdateCustomerInput): Promise<Customer>
  delete(id: string): Promise<void>
}

export function createCustomersModule(dependencies: CustomersModuleDependencies): CustomersModule {
  const service = new CustomerService(
    dependencies.repository,
    dependencies.clock,
    dependencies.ids,
  )

  return {
    getById: (id) => service.getById(id),
    findByPhone: (phone) => service.findByPhone(phone),
    findByEmail: (email) => service.findByEmail(email),
    findByPhoneOrEmail: (identifier) => service.findByPhoneOrEmail(identifier),
    findOrCreate: (input) => service.findOrCreate(input),
    create: (input) => service.create(input),
    update: (id, input) => service.update(id, input),
    delete: (id) => service.delete(id),
  }
}

export type {
  Customer,
  CustomerRepository,
  CustomerClock,
  CustomerIdGenerator,
} from './application/ports'

export { CustomerEntity } from './domain/customer'
export { CustomerNotFoundError, CustomerValidationError } from './application/customer-service'

