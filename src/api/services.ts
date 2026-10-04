import type { RequestContext } from '../app/middleware'

export async function handleGetServices(ctx: RequestContext): Promise<Response> {
  return Response.json({ ok: true, services: await ctx.modules.services.list() })
}

export async function handleGetService(ctx: RequestContext, params: Record<string, string>): Promise<Response> {
  return Response.json({ ok: true, service: await ctx.modules.services.getById(params.id) })
}
