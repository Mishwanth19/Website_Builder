import { CustomerEntity } from '../domain/customer'
import type { Customer, CustomerRepository, CustomerClock, CustomerIdGenerator } from './ports'

export class CustomerNotFoundError extends Error {
  readonly code = 'CUSTOMER_NOT_FOUND'
  constructor(id: string) { super(`Customer not found: ${id}`); this.name = 'CustomerNotFoundError' }
}
export class CustomerValidationError extends Error {
  readonly code = 'CUSTOMER_VALIDATION_ERROR'
  constructor(message: string) { super(message); this.name = 'CustomerValidationError' }
}
export interface CreateCustomerInput { name: string; phone: string; email?: string }
export interface UpdateCustomerInput { name?: string; phone?: string; email?: string }

export class CustomerService {
  constructor(
    private readonly repository: CustomerRepository,
    private readonly clock: CustomerClock,
    private readonly ids: CustomerIdGenerator,
  ) {}

  async getById(id: string): Promise<Customer> {
    const customer = await this.repository.findById(id)
    if (!customer) throw new CustomerNotFoundError(id)
    return customer
  }

  findByPhone(phone: string) { return this.repository.findByPhone(phone) }
  findByEmail(email: string) { return this.repository.findByEmail(email) }
  findByPhoneOrEmail(identifier: string) { return this.repository.findByPhoneOrEmail(identifier) }

  async findOrCreate(input: CreateCustomerInput): Promise<Customer> {
    const existing = await this.repository.findByPhone(input.phone)
    if (existing) {
      if (existing.name !== input.name || existing.email !== input.email) {
        return this.update(existing.id, { name: input.name, email: input.email })
      }
      return existing
    }
    return this.create(input)
  }

  async create(input: CreateCustomerInput): Promise<Customer> {
    const now = this.clock.now()
    const customer = new CustomerEntity({
      id: this.ids.generate(), name: input.name, phone: input.phone, email: input.email,
      createdAt: now, updatedAt: now,
    })
    try { customer.validate() } catch (error) {
      throw new CustomerValidationError(error instanceof Error ? error.message : 'Invalid customer')
    }
    return this.repository.create(customer)
  }

  async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const existing = await this.getById(id)
    const customer = new CustomerEntity(existing)
    customer.updateContact(input, this.clock)
    try { customer.validate() } catch (error) {
      throw new CustomerValidationError(error instanceof Error ? error.message : 'Invalid customer')
    }
    const result = await this.repository.update(id, {
      name: customer.name, phone: customer.phone, email: customer.email, updatedAt: customer.updatedAt,
    })
    if (!result) throw new CustomerNotFoundError(id)
    return result
  }

  async delete(id: string): Promise<void> {
    await this.getById(id)
    await this.repository.delete(id)
  }
}
