import { Env } from '../types'

export const handleAppointments = async (request: Request, env: Env): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const date = url.searchParams.get('date')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    let query = 'SELECT * FROM appointments WHERE 1=1'
    const bindings: any[] = []

    if (status) {
      query += ' AND status = ?'
      bindings.push(status)
    }

    if (date) {
      query += ' AND appointment_date = ?'
      bindings.push(date)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    bindings.push(limit)

    const result = await env.DB.prepare(query).bind(...bindings).all()

    return Response.json({
      ok: true,
      count: result.results?.length || 0,
      appointments: result.results
    })

  } catch (error) {
    console.error('Appointments error:', error)
    return Response.json({
      error: 'Failed to fetch appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}