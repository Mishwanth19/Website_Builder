export interface ProviderConfig {
  payment?: {
    provider: 'razorpay' | 'stripe' | 'none'
    apiKey?: string
    webhookSecret?: string
  }
  notification?: {
    provider: 'twilio' | 'whatsapp' | 'email' | 'none'
    accountSid?: string
    authToken?: string
    from?: string
  }
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  payment: {
    provider: 'none'
  },
  notification: {
    provider: 'none'
  }
}
