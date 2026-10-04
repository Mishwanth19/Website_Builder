export interface IdGenerator {
  generate(): string
}

export class SimpleIdGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID()
  }
}

export function createIdGenerator(): IdGenerator {
  return new SimpleIdGenerator()
}
