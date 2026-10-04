import type { Clock } from '../../../infrastructure/clock/system-clock'
import type { Customer } from '../domain/customer'
export interface CustomerRepository {
  findById(id: string): Promise<Customer | null>
  findByPhone(phone: string): Promise<Customer | null>
  findByEmail(email: string): Promise<Customer | null>
  findByPhoneOrEmail(identifier: string): Promise<Customer | null>
  create(customer: Customer): Promise<Customer>
  update(id: string, updates: Partial<Pick<Customer, 'name' | 'phone' | 'email'>> & { updatedAt: Date }): Promise<Customer | null>
  delete(id: string): Promise<boolean>
}
export type CustomerClock = Clock
export interface CustomerIdGenerator { generate(): string }
export type { Customer }
