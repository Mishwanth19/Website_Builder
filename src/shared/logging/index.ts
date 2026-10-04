export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  requestId?: string
  userId?: string
  [key: string]: any
}

export class Logger {
  constructor(private readonly context: LogContext = {}) {}

  private formatMessage(level: LogLevel, message: string, additionalContext?: LogContext): string {
    const timestamp = new Date().toISOString()
    const ctx = { ...this.context, ...additionalContext }
    const contextStr = Object.keys(ctx).length > 0 ? ` ${JSON.stringify(ctx)}` : ''
    return `[${timestamp}] [${level}] ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.DEBUG, message, context))
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage(LogLevel.INFO, message, context))
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, context))
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error
      ? {
          ...context,
          error: error.message,
          stack: error.stack
        }
      : context
    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext))
  }

  withContext(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context })
  }
}

export const logger = new Logger()
