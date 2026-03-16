import { Command, Flags } from '@oclif/core'
import { vaultWithdraw } from '../../lib/services.js'
import { requireExec } from '../../lib/guards.js'
import type { NetworkType } from '../../auth/wallet.js'

export default class VaultWithdraw extends Command {
  static description = 'Withdraw sBTC from the vault'
  static id = 'vault:withdraw'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> vault:withdraw --amount 0.001',
  ]

  static flags = {
    amount: Flags.string({
      description: 'Amount of sBTC to withdraw (e.g. 0.001)',
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
    const { flags } = await this.parse(VaultWithdraw)
    const network = flags.network as NetworkType

    requireExec('vault')

    const satoshis = Math.round(parseFloat(flags.amount) * 100_000_000)
    this.log(`Withdrawing ${flags.amount} sBTC (${satoshis} satoshis) from vault on ${network}...`)

    const txid = await vaultWithdraw(flags.amount, network)
    this.log(`Vault withdrawal initiated! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
