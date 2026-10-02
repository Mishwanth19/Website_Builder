import { Env } from '../types'

export const handleServices = async (request: Request, env: Env): Promise<Response> => {
  // Services could also be stored in D1, but for simplicity define here
  const services = [
    {
      id: 'bridal',
      name: 'Bridal makeup',
      price: 20000,
      duration: 180,
      description: 'Trial, airbrush or HD base, lashes, touch-up kit',
    },
    {
      id: 'hair',
      name: 'Bridal hair and draping',
      price: 7000,
      duration: 120,
      description: 'Hairstyle, jasmine or floral setting, saree draping',
    },
    {
      id: 'engagement',
      name: 'Engagement and reception',
      price: 10000,
      duration: 120,
      description: 'Full look with optional hairstyle',
    },
    {
      id: 'family',
      name: 'Family and guests',
      price: 3500,
      duration: 60,
      description: 'Per person, about 60 minutes',
    },
    {
      id: 'private',
      name: 'Private lesson',
      price: 4500,
      duration: 120,
      description: 'Two hours, learn a look for your features',
    },
  ]

  return Response.json({
    ok: true,
    services,
  })
}