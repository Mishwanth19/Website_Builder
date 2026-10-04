import type { D1Database } from '@cloudflare/workers-types'
import { logger } from '../../shared/logging'

export interface QueryResult<T> {
  results: T[]
  success: boolean
  meta?: {
    last_row_id?: number
    changes?: number
  }
}

export class BaseRepository {
  constructor(protected readonly db: D1Database) {}

  protected async query<T>(
    sql: string,
    params: any[] = []
  ): Promise<QueryResult<T>> {
    try {
      const stmt = this.db.prepare(sql)
      const result = await stmt.bind(...params).all()

      logger.debug('Database query', { resultCount: result.results?.length })

      return {
        results: (result.results as T[]) || [],
        success: result.success,
        meta: result.meta
      }
    } catch (error) {
      logger.error('Database query failed', error as Error)
      throw error
    }
  }

  protected async queryFirst<T>(
    sql: string,
    params: any[] = []
  ): Promise<T | null> {
    try {
      const stmt = this.db.prepare(sql)
      const result = await stmt.bind(...params).first()

      logger.debug('Database query first', { hasResult: !!result })

      return (result as T) || null
    } catch (error) {
      logger.error('Database query first failed', error as Error)
      throw error
    }
  }

  protected async execute(
    sql: string,
    params: any[] = []
  ): Promise<{ success: boolean; meta?: any }> {
    try {
      const stmt = this.db.prepare(sql)
      const result = await stmt.bind(...params).run()

      logger.debug('Database execute', { changes: result.meta?.changes })

      return {
        success: result.success,
        meta: result.meta
      }
    } catch (error) {
      logger.error('Database execute failed', error as Error)
      throw error
    }
  }

  protected async transaction<T>(
    callback: (db: D1Database) => Promise<T>
  ): Promise<T> {
    // D1 doesn't support explicit transactions in the same way
    // For now, we'll execute the callback directly
    // In a full implementation, we would use batch operations
    return callback(this.db)
  }
}
