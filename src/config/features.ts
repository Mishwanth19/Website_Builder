export interface FeatureFlags {
  booking: boolean
  payments: boolean
  customerPortal: boolean
  notifications: boolean
  adminPortal: boolean
  inquiries: boolean
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  booking: true,
  payments: false, // Disabled by default until configured
  customerPortal: true,
  notifications: false, // Disabled by default until provider configured
  adminPortal: true,
  inquiries: true
}
