import { Command } from '@oclif/core'
import { listJobs } from '../../lib/cron.js'

export default class CronList extends Command {
  static description = 'List all scheduled cron jobs'
  static id = 'cron:list'

  async run(): Promise<void> {
    const jobs = listJobs()

    if (jobs.length === 0) {
      this.log('No cron jobs scheduled. Use "stacks cron:add" to add one.')
      return
    }

    const header = ['NAME', 'COMMAND', 'INTERVAL', 'LAST RUN', 'NEXT RUN']
    const rows = jobs.map(job => [
      job.name,
      job.command.length > 40 ? job.command.slice(0, 37) + '...' : job.command,
      formatMs(job.intervalMs),
      job.lastRun ? new Date(job.lastRun).toLocaleString() : 'never',
      new Date(job.nextRun).toLocaleString(),
    ])

    const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)))
    const fmt = (row: string[]) => row.map((cell, i) => cell.padEnd(widths[i])).join('  ')

    this.log(fmt(header))
    this.log(widths.map(w => '-'.repeat(w)).join('  '))
    for (const row of rows) this.log(fmt(row))
  }
}

function formatMs(ms: number): string {
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`
  if (ms % 60_000 === 0) return `${ms / 60_000}m`
  return `${ms / 1000}s`
}
