export interface BusinessConfig {
  id: string
  name: string
  timezone: string
  phone?: string
  email?: string
  address?: string
  currency: string
  locale?: string
  branding?: {
    logo?: string
    colors?: Record<string, string>
  }
}

export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = {
  id: 'lumiere',
  name: 'Lumière Bridal Makeup',
  timezone: 'Asia/Kolkata',
  phone: '+91 97000 00000',
  email: 'hello@lumiere.example',
  address: '27, Eldams Road, Teynampet, Chennai 600018',
  currency: 'INR',
  locale: 'en-IN',
  branding: {
    colors: {
      primary: '#b23a55',
      secondary: '#4a2a26',
      accent: '#b8925a'
    }
  }
}
