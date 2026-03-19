import { Command } from '@oclif/core'
import { startDaemon } from '../../lib/cron.js'

export default class CronRun extends Command {
  static description = 'Start the cron daemon to execute scheduled jobs'
  static id = 'cron:run'

  static examples = [
    '<%= config.bin %> cron:run',
  ]

  async run(): Promise<void> {
    await startDaemon()
  }
}
