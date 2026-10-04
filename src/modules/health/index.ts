export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  checks: Record<string, boolean>
  timestamp: string
}

export interface HealthModuleDependencies {
  now: () => Date
  checkDatabase: () => Promise<boolean>
}

export interface HealthModule {
  check(): Promise<HealthCheckResult>
}

export function createHealthModule(dependencies: HealthModuleDependencies): HealthModule {
  return {
    async check() {
      let database = false
      try { database = await dependencies.checkDatabase() } catch { database = false }
      const checks = { database }
      return {
        status: database ? 'healthy' : 'unhealthy',
        checks,
        timestamp: dependencies.now().toISOString(),
      }
    },
  }
}
