import { Command, Flags } from '@oclif/core'
import { addJob, parseInterval } from '../../lib/cron.js'

export default class CronAdd extends Command {
  static description = 'Schedule a stacks command to run on a recurring interval'
  static id = 'cron:add'

  static examples = [
    '<%= config.bin %> cron:add --name vault-monitor --command "vault:info" --interval 30m',
    '<%= config.bin %> cron:add --name hourly-research --command "research:run --address ST1PY8... --iterations 3 --interval 5" --interval 1h',
  ]

  static flags = {
    name: Flags.string({
      description: 'Unique name for this cron job',
      required: true,
    }),
    command: Flags.string({
      description: 'stacks command to run (e.g. "vault:info" or "research:run --address ...")',
      required: true,
    }),
    interval: Flags.string({
      description: 'Interval between runs (e.g. 30s, 5m, 1h)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(CronAdd)
    const intervalMs = parseInterval(flags.interval)
    addJob(flags.name, flags.command, intervalMs)
    this.log(`Cron job "${flags.name}" added: runs "stacks ${flags.command}" every ${flags.interval}`)
  }
}
