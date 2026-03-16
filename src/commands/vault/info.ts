import { Command, Flags } from '@oclif/core'
import { vaultInfo } from '../../lib/services.js'
import type { NetworkType } from '../../auth/wallet.js'

export default class VaultInfo extends Command {
  static description = 'Get vault balance and total value locked'
  static id = 'vault:info'

  static examples = [
    '<%= config.bin %> vault:info',
    '<%= config.bin %> vault:info -a ST1ABC...',
  ]

  static flags = {
    address: Flags.string({
      char: 'a',
      description: 'Stacks address to query (defaults to wallet address)',
    }),
    network: Flags.string({
      char: 'n',
      description: 'Network to use',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(VaultInfo)
    const network = flags.network as NetworkType

    const { balance, totalValue } = await vaultInfo(flags.address, network)
    this.log(`Balance: ${balance} sBTC`)
    this.log(`Total Vault TVL: ${totalValue} sBTC`)
  }
}
