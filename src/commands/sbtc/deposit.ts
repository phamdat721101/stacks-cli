import { Command, Flags } from '@oclif/core'
import { sbtcDeposit } from '../../lib/services.js'
import { requireExec } from '../../lib/guards.js'
import type { NetworkType } from '../../auth/wallet.js'

export default class SbtcDeposit extends Command {
  static description = 'Deposit BTC to receive sBTC on Stacks'
  static id = 'sbtc:deposit'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> sbtc:deposit --amount 0.001',
    'ENABLE_EXEC=true <%= config.bin %> sbtc:deposit --amount 0.001 --recipient ST1ABC...',
  ]

  static flags = {
    amount: Flags.string({
      description: 'Amount of BTC to deposit (e.g. 0.001)',
      required: true,
    }),
    recipient: Flags.string({
      description: 'Stacks address to receive sBTC (defaults to wallet address)',
    }),
    network: Flags.string({
      char: 'n',
      description: 'Network to use',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(SbtcDeposit)
    const network = flags.network as NetworkType

    requireExec('sbtc')

    const satoshis = Math.round(parseFloat(flags.amount) * 100_000_000)
    this.log(`Depositing ${flags.amount} BTC (${satoshis} satoshis) on ${network}...`)

    const txid = await sbtcDeposit(flags.amount, flags.recipient, network)
    this.log(`sBTC deposit initiated! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
