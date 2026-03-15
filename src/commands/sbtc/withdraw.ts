import { Command, Flags } from '@oclif/core'
import { sbtcWithdraw } from '../../lib/services.js'
import { requireExec } from '../../lib/guards.js'
import type { NetworkType } from '../../auth/wallet.js'

export default class SbtcWithdraw extends Command {
  static description = 'Withdraw sBTC back to Bitcoin'
  static id = 'sbtc:withdraw'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> sbtc:withdraw --amount 0.001 --btcAddress bc1q...',
  ]

  static flags = {
    amount: Flags.string({
      description: 'Amount of sBTC to withdraw (in BTC)',
      required: true,
    }),
    btcAddress: Flags.string({
      description: 'Bitcoin address to receive BTC',
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
    const { flags } = await this.parse(SbtcWithdraw)
    const network = flags.network as NetworkType

    requireExec('sbtc')

    const satoshis = Math.round(parseFloat(flags.amount) * 100_000_000)
    this.log(`Withdrawing ${flags.amount} sBTC (${satoshis} satoshis) to ${flags.btcAddress} on ${network}...`)

    const txid = await sbtcWithdraw(flags.amount, flags.btcAddress, network)
    this.log(`sBTC withdrawal initiated! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
