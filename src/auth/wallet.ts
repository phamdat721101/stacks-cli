import { StacksTestnet, StacksMainnet } from '@stacks/network'
import { getAddressFromPrivateKey, TransactionVersion } from '@stacks/transactions'
import 'dotenv/config'

export type NetworkType = 'testnet' | 'mainnet'

export class WalletManager {
  private network: NetworkType

  constructor(network: NetworkType = 'testnet') {
    this.network = network
  }

  getNetwork(): StacksTestnet | StacksMainnet {
    if (this.network === 'mainnet') {
      return new StacksMainnet()
    }
    return new StacksTestnet()
  }

  getPrivateKey(): string {
    const key = process.env.STACKS_PRIVATE_KEY
    if (!key) {
      throw new Error('STACKS_PRIVATE_KEY environment variable is not set')
    }
    return key
  }

  getAddress(): string {
    const privateKey = this.getPrivateKey()
    const version =
      this.network === 'mainnet' ? TransactionVersion.Mainnet : TransactionVersion.Testnet
    return getAddressFromPrivateKey(privateKey, version)
  }
}
