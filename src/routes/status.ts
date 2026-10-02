import { Env } from '../types'

export const handleUpdateStatus = async (request: Request, env: Env): Promise<Response> => {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return Response.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Invalid status value' }, { status: 400 })
    }

    await env.DB.prepare(
      'UPDATE appointments SET status = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(status, id).run()

    // If appointment marked as completed, trigger thank-you follow-up
    if (status === 'completed') {
      // Could send thank you message here
    }

    return Response.json({
      ok: true,
      updated: status,
      message: `Appointment #${id} status updated to ${status}`
    })

  } catch (error) {
    console.error('Status update error:', error)
    return Response.json({
      error: 'Failed to update status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}