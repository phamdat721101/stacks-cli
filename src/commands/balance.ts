import { Command, Flags } from '@oclif/core'
import { getBalance } from '../lib/services.js'
import type { NetworkType } from '../auth/wallet.js'

export default class Balance extends Command {
  static description = 'Get STX balance for an address'

  static examples = [
    '<%= config.bin %> balance -a ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    '<%= config.bin %> balance -a ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM -n mainnet',
  ]

  static flags = {
    address: Flags.string({
      char: 'a',
      description: 'Stacks address to query',
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
    const { flags } = await this.parse(Balance)
    const network = flags.network as NetworkType

    const result = await getBalance(flags.address, network)
    const stxBalance = (BigInt(result.stx) / 1_000_000n).toString()
    const locked = (BigInt(result.locked) / 1_000_000n).toString()

    this.log(`Address: ${flags.address}`)
    this.log(`Network: ${network}`)
    this.log(`Balance: ${stxBalance} STX`)
    this.log(`Locked:  ${locked} STX`)
  }
}
