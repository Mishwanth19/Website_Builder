import type { RequestContext } from '../app/middleware'

export async function handleHealth(ctx: RequestContext): Promise<Response> {
  const result = await ctx.modules.health.check()
  return Response.json(result, {
    status: result.status === 'healthy' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
