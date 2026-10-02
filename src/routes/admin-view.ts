import { Env } from '../types'

export const handleAdminView = async (request: Request, env: Env): Promise<Response> => {
  try {
    const url = new URL(request.url)
    const view = url.searchParams.get('view') || 'today'
    const limit = parseInt(url.searchParams.get('limit') || '50')

    let query: string
    let bindings: any[]

    const today = new Date().toISOString().split('T')[0]

    switch (view) {
      case 'today':
        query = 'SELECT * FROM appointments WHERE appointment_date = ? ORDER BY appointment_time ASC LIMIT ?'
        bindings = [today, limit]
        break

      case 'upcoming':
        query = "SELECT * FROM appointments WHERE appointment_date >= ? AND status != 'cancelled' ORDER BY appointment_date ASC, appointment_time ASC LIMIT ?"
        bindings = [today, limit]
        break

      case 'pending':
        query = "SELECT * FROM appointments WHERE status = 'pending' ORDER BY created_at DESC LIMIT ?"
        bindings = [limit]
        break

      case 'all':
        query = 'SELECT * FROM appointments ORDER BY created_at DESC LIMIT ?'
        bindings = [limit]
        break

      default:
        query = 'SELECT * FROM appointments ORDER BY created_at DESC LIMIT ?'
        bindings = [limit]
    }

    const result = await env.DB.prepare(query).bind(...bindings).all()
    const appointments = result.results || []

    // Group by date for calendar view
    const grouped: Record<string, any[]> = {}
    for (const appt of appointments) {
      const date = appt.appointment_date || appt.created_at?.split('T')[0]
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(appt)
    }

    return Response.json({
      ok: true,
      view,
      count: appointments.length,
      grouped,
      appointments,
    })

  } catch (error) {
    console.error('Admin view error:', error)
    return Response.json({
      error: 'Failed to fetch admin view',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}