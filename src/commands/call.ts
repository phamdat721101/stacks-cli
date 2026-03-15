import { Command, Flags } from '@oclif/core'
import { callContract } from '../lib/services.js'
import { requireExec } from '../lib/guards.js'
import type { NetworkType } from '../auth/wallet.js'

export default class Call extends Command {
  static description = 'Call a Clarity smart contract function'

  static examples = [
    'ENABLE_EXEC=true <%= config.bin %> call --contract ST1ABC.my-contract --function transfer --args 1000 recipient',
  ]

  static flags = {
    contract: Flags.string({
      description: 'Contract in format "address.name"',
      required: true,
    }),
    function: Flags.string({
      description: 'Function name to call',
      required: true,
    }),
    args: Flags.string({
      description: 'Function arguments',
      multiple: true,
      default: [],
    }),
    network: Flags.string({
      char: 'n',
      description: 'Network to use',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Call)
    const network = flags.network as NetworkType

    requireExec('call')

    this.log(`Calling ${flags.contract}::${flags.function} on ${network}...`)
    const txid = await callContract(flags.contract, flags.function, flags.args, network)
    this.log(`Transaction broadcast! TX ID: ${txid}`)
    this.log(`View at: https://explorer.hiro.so/txid/${txid}?chain=${network}`)
  }
}
