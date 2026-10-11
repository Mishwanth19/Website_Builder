import type { RequestContext } from './middleware'
import { authenticateRequest, isAllowedOrigin, parseAllowedOrigins, readSessionToken } from './middleware'
import { AppError, NotFoundError } from '../shared/errors'

export interface Route {
  method: string
  path: string
  handler: (ctx: RequestContext, request: Request, params: Record<string, string>) => Promise<Response>
  auth?: boolean
  roles?: Array<'admin' | 'staff' | 'customer'>
}

export class Router {
  private readonly routes: Route[] = []

  add(route: Route): this { this.routes.push(route); return this }
  get(path: string, handler: Route['handler'], options?: Pick<Route, 'auth' | 'roles'>) { return this.add({ method: 'GET', path, handler, ...options }) }
  post(path: string, handler: Route['handler'], options?: Pick<Route, 'auth' | 'roles'>) { return this.add({ method: 'POST', path, handler, ...options }) }
  patch(path: string, handler: Route['handler'], options?: Pick<Route, 'auth' | 'roles'>) { return this.add({ method: 'PATCH', path, handler, ...options }) }

  private matchPath(routePath: string, requestPath: string): Record<string, string> | null {
    const route = routePath.split('/').filter(Boolean)
    const request = requestPath.split('/').filter(Boolean)
    if (route.length !== request.length) return null
    const params: Record<string, string> = {}
    for (let i = 0; i < route.length; i++) {
      if (route[i].startsWith(':')) {
        try { params[route[i].slice(1)] = decodeURIComponent(request[i]) } catch { return null }
      } else if (route[i] !== request[i]) return null
    }
    return params
  }

  match(request: Request): { route: Route; params: Record<string, string> } | null {
    const url = new URL(request.url)
    for (const route of this.routes) {
      if (route.method !== request.method) continue
      const params = this.matchPath(route.path, url.pathname)
      if (params) return { route, params }
    }
    return null
  }

  async handle(request: Request, ctx: RequestContext): Promise<Response> {
    const match = this.match(request)
    if (!match) throw new NotFoundError('Route')
    const { route, params } = match

    // Enforce Origin checks server-side; CORS response headers alone do not stop CSRF.
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('Origin')
      const allowedOrigins = parseAllowedOrigins(ctx.env)
      if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
        throw new AppError('Untrusted request origin', 'CSRF_REJECTED', 403)
      }
      const cookieHeader = request.headers.get('Cookie') ?? ''
      const usesSessionCookie = cookieHeader.split(';').some(part => part.trim().startsWith('session='))
      if (usesSessionCookie && (!origin || !isAllowedOrigin(origin, allowedOrigins))) {
        throw new AppError('Request origin validation failed', 'CSRF_REJECTED', 403)
      }
      // Bearer-token API clients do not rely on ambient browser cookies.
      if (usesSessionCookie && !readSessionToken(request)) {
        throw new AppError('Authentication required', 'AUTH_REQUIRED', 401)
      }
    }

    if (route.auth) await authenticateRequest(request, ctx)
    if (route.auth && !ctx.userId) throw new AppError('Authentication required', 'AUTH_REQUIRED', 401)
    if (route.roles && (!ctx.userRole || !route.roles.includes(ctx.userRole))) {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403)
    }
    return route.handler(ctx, request, params)
  }
}
