import { handleAvailability } from './routes/availability'
import { handleBook } from './routes/book'
import { handleAppointments } from './routes/appointments'
import { handleContact } from './routes/contact'
import { handleUpdateStatus } from './routes/status'
import { handleClientView } from './routes/client-view'
import { handleAdminView } from './routes/admin-view'
import { handleServices } from './routes/services'
import { handleHealth } from './routes/health'
import { Env } from './types'

import type { ScheduledController, ExecutionContext } from '@cloudflare/workers-types'
import { runDailyJobs } from './scheduler'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
      })
    }

    // Health check
    if (path === '/health') return handleHealth()

    // Root → serve a simple HTML landing page (for local dev)
    // In production, Cloudflare Pages serves public/index.html at /
    // if (path === '/' && method === 'GET') {
    //   return new Response(`
    //     <!DOCTYPE html>
    //     <html><head><meta charset="utf-8"><title>Lumière</title></head>
    //     <body><h1>Lumière Bridal Booking</h1>
    //     <p>Running in development mode. <a href="/api/health">Health check</a>.</p>
    //     <p>Use <code>npm run dev</code> and visit <code>http://localhost:8787</code></p></body></html>
    //   `, { headers: { 'Content-Type': 'text/html' } })
    // }

    // Public API routes
    if (path === '/api/availability' && method === 'GET') return handleAvailability(request, env)
    if (path === '/api/services' && method === 'GET') return handleServices(request, env)
    if (path === '/api/book' && method === 'POST') return handleBook(request, env)
    if (path === '/api/contact' && method === 'POST') return handleContact(request, env)
    if (path === '/api/appointments' && method === 'GET') return handleAppointments(request, env)
    if (path === '/api/appointments' && method === 'PATCH') return handleUpdateStatus(request, env)
    if (path === '/api/client-view' && method === 'GET') return handleClientView(request, env)
    if (path === '/api/admin-view' && method === 'GET') return handleAdminView(request, env)

    // Static assets (served by Pages)
    return new Response('Not found', { status: 404 })
  },

async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    console.log('Cron triggered:', controller.cron)
    await runDailyJobs(env)
  },
}
