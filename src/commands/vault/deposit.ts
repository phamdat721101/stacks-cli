import { Command, Flags } from '@oclif/core'
import { vaultDeposit } from '../../lib/services.js'
import { requireExec } from '../../lib/guards.js'
import type { NetworkType } from '../../auth/wallet.js'

export default class VaultDeposit extends Command {
  static description = 'Deposit sBTC into the vault'
  static id = 'vault:deposit'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> vault:deposit --amount 0.001',
  ]

  static flags = {
    amount: Flags.string({
      description: 'Amount of sBTC to deposit (e.g. 0.001)',
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
    const { flags } = await this.parse(VaultDeposit)
    const network = flags.network as NetworkType

    requireExec('vault')

    const satoshis = Math.round(parseFloat(flags.amount) * 100_000_000)
    this.log(`Depositing ${flags.amount} sBTC (${satoshis} satoshis) into vault on ${network}...`)

    const txid = await vaultDeposit(flags.amount, network)
    this.log(`Vault deposit initiated! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
