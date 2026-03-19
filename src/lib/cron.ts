import { homedir } from 'os'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { spawn } from 'child_process'

const CRONS_FILE = join(homedir(), '.stacks-cli-crons.json')

export interface CronJob {
  name: string
  command: string
  intervalMs: number
  lastRun?: number
  nextRun: number
}

export function loadJobs(): CronJob[] {
  if (!existsSync(CRONS_FILE)) return []
  try {
    return JSON.parse(readFileSync(CRONS_FILE, 'utf-8')) as CronJob[]
  } catch {
    return []
  }
}

export function saveJobs(jobs: CronJob[]): void {
  writeFileSync(CRONS_FILE, JSON.stringify(jobs, null, 2))
}

export function addJob(name: string, command: string, intervalMs: number): void {
  const jobs = loadJobs()
  const existing = jobs.findIndex(j => j.name === name)
  const job: CronJob = { name, command, intervalMs, nextRun: Date.now() + intervalMs }
  if (existing >= 0) {
    jobs[existing] = job
  } else {
    jobs.push(job)
  }
  saveJobs(jobs)
}

export function listJobs(): CronJob[] {
  return loadJobs()
}

export function removeJob(name: string): void {
  const jobs = loadJobs().filter(j => j.name !== name)
  saveJobs(jobs)
}

export function parseInterval(s: string): number {
  const match = s.match(/^(\d+)(s|m|h)$/)
  if (!match) throw new Error(`Invalid interval: "${s}". Use formats like 30s, 5m, 1h`)
  const value = parseInt(match[1], 10)
  switch (match[2]) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 3_600_000
    default: throw new Error(`Unknown unit: ${match[2]}`)
  }
}

export async function startDaemon(): Promise<void> {
  console.log('Cron daemon started. Press Ctrl+C to stop.')

  setInterval(() => {
    const jobs = loadJobs()
    const now = Date.now()
    let changed = false

    for (const job of jobs) {
      if (now >= job.nextRun) {
        console.log(`[${new Date().toISOString()}] Running: stacks ${job.command}`)
        const parts = job.command.split(' ')
        const child = spawn('stacks', parts, { stdio: 'inherit' })
        child.on('error', (err: Error) => console.error(`Failed to spawn job "${job.name}": ${err.message}`))
        job.lastRun = now
        job.nextRun = now + job.intervalMs
        changed = true
      }
    }

    if (changed) saveJobs(jobs)
  }, 5000)

  // Keep process alive indefinitely
  await new Promise<void>(() => {})
}
