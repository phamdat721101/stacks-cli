import { Command, Flags } from '@oclif/core'
import { stackStx } from '../lib/services.js'
import { requireExec } from '../lib/guards.js'
import type { NetworkType } from '../auth/wallet.js'

export default class Stack extends Command {
  static description = 'Stack STX for PoX rewards'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> stack --amount 100000 --cycles 1 --poxAddress bc1q...',
  ]

  static flags = {
    amount: Flags.string({
      description: 'Amount of STX to stack (in µSTX)',
      required: true,
    }),
    cycles: Flags.integer({
      description: 'Number of reward cycles',
      default: 1,
    }),
    poxAddress: Flags.string({
      description: 'Bitcoin address for PoX rewards',
      required: true,
    }),
    network: Flags.string({
      char: 'n',
      description: 'Network to use',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Stack)
    const network = flags.network as NetworkType

    requireExec('stack')

    const amountMicroStx = BigInt(flags.amount)
    const stxAmount = amountMicroStx / 1_000_000n

    this.log(`Stacking ${stxAmount} STX for ${flags.cycles} cycle(s) on ${network}...`)
    this.log(`PoX reward address: ${flags.poxAddress}`)

    const txid = await stackStx(amountMicroStx, flags.cycles, flags.poxAddress, network)
    this.log(`Stacking transaction submitted! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
