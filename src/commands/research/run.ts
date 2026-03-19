import { Command, Flags } from '@oclif/core'
import { runResearchLoop } from '../../lib/research.js'
import { existsSync, readFileSync } from 'fs'
import type { NetworkType } from '../../auth/wallet.js'
import 'dotenv/config'

export default class ResearchRun extends Command {
  static description = 'Run an autonomous research loop monitoring Stacks blockchain state'
  static id = 'research:run'

  static examples = [
    '<%= config.bin %> research:run --address ST1PY8K93CXJ4925VE7EGF2NVP1H2ZHEK4R6Y0DD3 --iterations 5 --interval 30',
  ]

  static flags = {
    address: Flags.string({
      description: 'Stacks address to monitor',
      required: true,
    }),
    strategy: Flags.string({
      description: 'Path to strategy markdown file (uses default strategy if omitted)',
    }),
    iterations: Flags.integer({
      description: 'Number of research iterations',
      default: 5,
    }),
    interval: Flags.integer({
      description: 'Seconds between iterations',
      default: 10,
    }),
    log: Flags.string({
      description: 'Path to TSV log file',
      default: 'research-log.tsv',
    }),
    network: Flags.string({
      char: 'n',
      description: 'Stacks network',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ResearchRun)

    if (!process.env.ANTHROPIC_API_KEY) {
      this.error('ANTHROPIC_API_KEY is not set')
    }

    let strategy = ''
    if (flags.strategy) {
      if (!existsSync(flags.strategy)) this.error(`Strategy file not found: ${flags.strategy}`)
      strategy = readFileSync(flags.strategy, 'utf-8')
    } else if (existsSync('research.md')) {
      strategy = readFileSync('research.md', 'utf-8')
    }

    await runResearchLoop({
      strategy,
      iterations: flags.iterations,
      intervalSec: flags.interval,
      address: flags.address,
      logFile: flags.log,
      network: flags.network as NetworkType,
    })
  }
}
