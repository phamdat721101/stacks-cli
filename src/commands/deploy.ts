import { Command, Flags } from '@oclif/core'
import { deployContract } from '../lib/services.js'
import { requireExec } from '../lib/guards.js'
import type { NetworkType } from '../auth/wallet.js'

export default class Deploy extends Command {
  static description = 'Deploy a Clarity smart contract to Stacks'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> deploy -c ./contract.clar -n my-contract',
  ]

  static flags = {
    contract: Flags.string({
      char: 'c',
      description: 'Path to the Clarity contract file',
      required: true,
    }),
    name: Flags.string({
      char: 'n',
      description: 'Contract name',
      required: true,
    }),
    network: Flags.string({
      description: 'Network to use',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Deploy)
    const network = flags.network as NetworkType

    requireExec('deploy')

    this.log(`Deploying contract "${flags.name}" from ${flags.contract} on ${network}...`)
    const txid = await deployContract(flags.contract, flags.name, network)
    this.log(`Contract deployed! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
