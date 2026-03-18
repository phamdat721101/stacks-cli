import { createClient } from '@stacks/blockchain-api-client'
import {
  makeContractDeploy,
  makeContractCall,
  broadcastTransaction,
  callReadOnlyFunction,
  uintCV,
  principalCV,
  stringUtf8CV,
  ClarityValue,
  AnchorMode,
  cvToValue,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  makeContractSTXPostCondition,
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

  const nonAsciiMatch = codeBody.match(/[^\x20-\x7E\t\n\r]/)
  if (nonAsciiMatch) {
    const line = codeBody.slice(0, codeBody.indexOf(nonAsciiMatch[0])).split('\n').length
    throw new Error(
      `Contract source contains a non-ASCII character on line ${line}: ` +
      `U+${nonAsciiMatch[0].codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}. ` +
      `Stacks contracts must use only printable ASCII characters.`
    )
  }

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

function getVaultContract(network: NetworkType): string {
  if (process.env.VAULT_CONTRACT) return process.env.VAULT_CONTRACT
  const wallet = new WalletManager(network)
  return `${wallet.getAddress()}.sbtc-vault`
}

export async function vaultDeposit(amount: string, network: NetworkType = 'testnet'): Promise<string> {
  checkRateLimit()
  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const satoshis = Math.round(parseFloat(amount) * 100_000_000)
  const [contractAddress, contractName] = getVaultContract(network).split('.')
  const senderAddress = wallet.getAddress()

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'deposit',
    functionArgs: [uintCV(BigInt(satoshis))],
    senderKey: privateKey,
    network: stacksNetwork,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardSTXPostCondition(senderAddress, FungibleConditionCode.Equal, BigInt(satoshis)),
    ],
  })

  const result = await broadcastTransaction(tx, stacksNetwork)
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${(result as { reason?: string }).reason}`)
  }
  return result.txid
}

export async function vaultWithdraw(amount: string, network: NetworkType = 'testnet'): Promise<string> {
  checkRateLimit()
  const wallet = new WalletManager(network)
  const privateKey = wallet.getPrivateKey()
  const stacksNetwork = wallet.getNetwork()
  const satoshis = Math.round(parseFloat(amount) * 100_000_000)
  const [contractAddress, contractName] = getVaultContract(network).split('.')

  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: 'withdraw',
    functionArgs: [uintCV(BigInt(satoshis))],
    senderKey: privateKey,
    network: stacksNetwork,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeContractSTXPostCondition(contractAddress, contractName, FungibleConditionCode.Equal, BigInt(satoshis)),
    ],
  })

  const result = await broadcastTransaction(tx, stacksNetwork)
  if ('error' in result) {
    throw new Error(`Broadcast failed: ${result.error} — ${(result as { reason?: string }).reason}`)
  }
  return result.txid
}

/**
 * Safely extract a BigInt from a cvToValue result.
 * cvToValue may return a plain string/number OR a Clarity response object
 * like { type: 'ok', value: '0' }. This helper unwraps it.
 */
function extractBigInt(cv: unknown): bigint {
  if (typeof cv === 'bigint') return cv
  if (typeof cv === 'number' || typeof cv === 'string') return BigInt(cv)
  if (cv !== null && typeof cv === 'object') {
    const obj = cv as Record<string, unknown>
    if ('value' in obj) return extractBigInt(obj.value)
  }
  return 0n
}

export async function vaultInfo(
  addressOverride: string | undefined,
  network: NetworkType = 'testnet'
): Promise<{ balance: string; totalValue: string }> {
  const wallet = new WalletManager(network)
  const address = addressOverride ?? wallet.getAddress()
  const stacksNetwork = wallet.getNetwork()
  const [contractAddress, contractName] = getVaultContract(network).split('.')

  const balanceResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-balance',
    functionArgs: [principalCV(address)],
    network: stacksNetwork,
    senderAddress: address,
  })

  const totalResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-total-value',
    functionArgs: [],
    network: stacksNetwork,
    senderAddress: address,
  })

  const balanceSats = extractBigInt(cvToValue(balanceResult, true))
  const totalSats = extractBigInt(cvToValue(totalResult, true))
  const balance = (Number(balanceSats) / 100_000_000).toFixed(8)
  const totalValue = (Number(totalSats) / 100_000_000).toFixed(8)

  return { balance, totalValue }
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
