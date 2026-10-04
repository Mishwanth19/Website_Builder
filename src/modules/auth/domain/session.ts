export type UserType = 'admin' | 'staff' | 'customer'
export interface Session {
  id: string; userId: string; userType: UserType; token: string; expiresAt: Date; createdAt: Date; updatedAt: Date
}
export class SessionEntity implements Session {
  id!: string; userId!: string; userType!: UserType; token!: string; expiresAt!: Date; createdAt!: Date; updatedAt!: Date
  constructor(data: Session) { Object.assign(this, data) }
  isExpired(clock: { now(): Date }): boolean { return clock.now() > this.expiresAt }
  isValid(clock: { now(): Date }): boolean { return !this.isExpired(clock) }
}
