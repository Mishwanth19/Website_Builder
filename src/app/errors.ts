import { AppError } from '../shared/errors'
import { logger } from '../shared/logging'

export function handleError(error: unknown): Response {
  if (error instanceof AppError) {
    logger.error('Application error', error, { code: error.code })
    return Response.json(error.toJSON(), { status: error.statusCode })
  }
  if (error instanceof Error) {
    logger.error('Application error', error)
    const code = (error as { code?: string }).code
    if (code?.includes('NOT_FOUND')) return Response.json({ error: error.message, code }, { status: 404 })
    if (code?.includes('VALIDATION')) return Response.json({ error: error.message, code }, { status: 400 })
    if (code?.includes('CONFLICT') || code?.includes('TRANSITION')) return Response.json({ error: error.message, code }, { status: 409 })
    if (code?.includes('AUTH') || code?.includes('CREDENTIALS') || code?.includes('SESSION')) return Response.json({ error: error.message, code }, { status: 401 })
    return Response.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
  }
  return Response.json({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }, { status: 500 })
}
