export const handleHealth = (): Response => {
  return Response.json({
    status: 'ok',
    service: 'lumiere-bridal-booking',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
}