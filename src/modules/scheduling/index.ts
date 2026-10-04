export interface ScheduledJob {
  name: string
  execute(): Promise<void>
}

export interface SchedulingModule {
  register(job: ScheduledJob): void
  execute(name: string): Promise<void>
  executeAll(): Promise<void>
}

export function createSchedulingModule(): SchedulingModule {
  const jobs = new Map<string, ScheduledJob>()

  return {
    register(job) { jobs.set(job.name, job) },
    async execute(name) {
      const job = jobs.get(name)
      if (!job) throw new Error(`Job not found: ${name}`)
      await job.execute()
    },
    async executeAll() {
      for (const job of jobs.values()) {
        try { await job.execute() }
        catch (error) { console.error(`Scheduled job "${job.name}" failed`, error) }
      }
    },
  }
}
