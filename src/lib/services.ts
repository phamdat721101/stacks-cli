import { createClient } from '@stacks/blockchain-api-client'
import {
  makeContractDeploy,
  makeContractCall,
  broadcastTransaction,
  uintCV,
  stringUtf8CV,
  ClarityValue,
  AnchorMode,
} from '@stacks/transactions'
import { StackingClient } from '@stacks/stacking'
import { WalletManager, NetworkType } from '../auth/wallet.js'
import { checkRateLimit } from './guards.js'
import { readFileSync } from 'fs'

function getApiBase(network: NetworkType): string {
  return `https://api.${network}.hiro.so`
}

export async function getBalance(address: string, network: NetworkType = 'testnet'): Promise<{
  stx: string
  locked: string
}> {
  const client = createClient({ baseUrl: getApiBase(network) })
  const { data, error } = await client.GET('/extended/v1/address/{principal}/balances', {
    params: { path: { principal: address } },
  })
  if (error) throw new Error(`Failed to fetch balance: ${JSON.stringify(error)}`)
  return {
    stx: data.stx.balance as string,
    locked: data.stx.locked as string,
  }
}

export async function deployContract(
  contractPath: string,
  contractName: string,
  network: NetworkType = 'testnet'
): Promise<string> {
  checkRateLimit()
  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const codeBody = readFileSync(contractPath, 'utf-8')

  const tx = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey: privateKey,
    network: stacksNetwork,
    anchorMode: AnchorMode.Any,
  })

  const result = await broadcastTransaction(tx, stacksNetwork)
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${(result as { reason?: string }).reason}`)
  }
  return result.txid
}

export async function callContract(
  contract: string,
  functionName: string,
  args: string[],
  network: NetworkType = 'testnet'
): Promise<string> {
  checkRateLimit()
  const [contractAddress, contractName] = contract.split('.')
  if (!contractAddress || !contractName) {
    throw new Error('Contract must be in format "address.name"')
  }

  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const functionArgs: ClarityValue[] = args.map(arg =>
    /^\d+$/.test(arg) ? uintCV(BigInt(arg)) : stringUtf8CV(arg)
  )

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName,
    functionArgs,
    senderKey: privateKey,
    network: stacksNetwork,
    anchorMode: AnchorMode.Any,
  })

  const result = await broadcastTransaction(tx, stacksNetwork)
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${(result as { reason?: string }).reason}`)
  }
  return result.txid
}

export async function sbtcDeposit(
  amount: string,
  recipientOverride?: string,
  network: NetworkType = 'testnet'
): Promise<string> {
  checkRateLimit()
  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const recipient = recipientOverride ?? wallet.getAddress()
  const satoshis = Math.round(parseFloat(amount) * 100_000_000)
  const SBTC_BRIDGE = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-bridge'
  const [contractAddress, contractName] = SBTC_BRIDGE.split('.')

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'deposit',
    functionArgs: [uintCV(BigInt(satoshis)), stringUtf8CV(recipient)],
    senderKey: privateKey,
    network: stacksNetwork,
    anchorMode: AnchorMode.Any,
  })

  const result = await broadcastTransaction(tx, stacksNetwork)
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${(result as { reason?: string }).reason}`)
  }
  return result.txid
}

export async function sbtcWithdraw(
  amount: string,
  btcAddress: string,
  network: NetworkType = 'testnet'
): Promise<string> {
  checkRateLimit()
  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const satoshis = Math.round(parseFloat(amount) * 100_000_000)
  const SBTC_BRIDGE = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.sbtc-bridge'
  const [contractAddress, contractName] = SBTC_BRIDGE.split('.')

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'withdraw',
    functionArgs: [uintCV(BigInt(satoshis)), stringUtf8CV(btcAddress)],
    senderKey: privateKey,
    network: stacksNetwork,
    anchorMode: AnchorMode.Any,
  })

  const result = await broadcastTransaction(tx, stacksNetwork)
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${(result as { reason?: string }).reason}`)
  }
  return result.txid
}

export async function stackStx(
  amount: bigint,
  cycles: number,
  poxAddress: string,
  network: NetworkType = 'testnet'
): Promise<string> {
  checkRateLimit()
  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const client = new StackingClient(wallet.getAddress(), stacksNetwork)

  const tx = await client.stack({
    amountMicroStx: amount,
    poxAddress,
    cycles,
    privateKey,
    burnBlockHeight: await client.getCoreInfo().then(info => info.burn_block_height),
  })

  return tx.txid
}
