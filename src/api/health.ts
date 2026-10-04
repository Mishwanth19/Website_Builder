import type { RequestContext } from '../app/middleware'

export async function handleHealth(ctx: RequestContext): Promise<Response> {
  return Response.json(await ctx.modules.health.check())
}
