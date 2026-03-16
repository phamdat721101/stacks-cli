import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { getBalance, deployContract, callContract, sbtcDeposit, vaultDeposit, vaultWithdraw, vaultInfo } from '../lib/services.js'
import { requireExec } from '../lib/guards.js'
import type { NetworkType } from '../auth/wallet.js'
import 'dotenv/config'

const GetBalanceInput = z.object({
  address: z.string().describe('Stacks address to query'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const DeployContractInput = z.object({
  contractCode: z.string().describe('Path to Clarity contract file'),
  contractName: z.string().describe('Contract name'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const CallContractInput = z.object({
  contract: z.string().describe('Contract in "address.name" format'),
  function: z.string().describe('Function name to call'),
  args: z.array(z.string()).default([]).describe('Function arguments'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const SbtcDepositInput = z.object({
  amount: z.string().describe('Amount in BTC (e.g. 0.001)'),
  recipient: z.string().optional().describe('Stacks address to receive sBTC'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const VaultDepositInput = z.object({
  amount: z.string().describe('Amount of sBTC to deposit (e.g. 0.001)'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const VaultWithdrawInput = z.object({
  amount: z.string().describe('Amount of sBTC to withdraw (e.g. 0.001)'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const VaultInfoInput = z.object({
  address: z.string().optional().describe('Stacks address to query'),
  network: z.enum(['testnet', 'mainnet']).default('testnet'),
})

const server = new Server(
  { name: 'stacks-cli', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'stacks_get_balance',
      description: 'Get the STX balance for a Stacks address',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Stacks address to query' },
          network: { type: 'string', enum: ['testnet', 'mainnet'], description: 'Network' },
        },
        required: ['address'],
      },
    },
    {
      name: 'stacks_deploy_contract',
      description: 'Deploy a Clarity smart contract to the Stacks blockchain',
      inputSchema: {
        type: 'object',
        properties: {
          contractCode: { type: 'string', description: 'Path to Clarity contract file' },
          contractName: { type: 'string', description: 'Contract name' },
          network: { type: 'string', enum: ['testnet', 'mainnet'], description: 'Network' },
        },
        required: ['contractCode', 'contractName'],
      },
    },
    {
      name: 'stacks_call_contract',
      description: 'Call a public function on a Clarity smart contract',
      inputSchema: {
        type: 'object',
        properties: {
          contract: { type: 'string', description: 'Contract in "address.name" format' },
          function: { type: 'string', description: 'Function name' },
          args: { type: 'array', items: { type: 'string' }, description: 'Arguments' },
          network: { type: 'string', enum: ['testnet', 'mainnet'] },
        },
        required: ['contract', 'function'],
      },
    },
    {
      name: 'stacks_sbtc_deposit',
      description: 'Deposit BTC to receive sBTC on the Stacks blockchain',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'string', description: 'Amount in BTC (e.g. 0.001)' },
          recipient: { type: 'string', description: 'Stacks address to receive sBTC' },
          network: { type: 'string', enum: ['testnet', 'mainnet'] },
        },
        required: ['amount'],
      },
    },
    {
      name: 'stacks_vault_deposit',
      description: 'Deposit sBTC into the sBTC vault',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'string', description: 'Amount of sBTC to deposit (e.g. 0.001)' },
          network: { type: 'string', enum: ['testnet', 'mainnet'] },
        },
        required: ['amount'],
      },
    },
    {
      name: 'stacks_vault_withdraw',
      description: 'Withdraw sBTC from the sBTC vault',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'string', description: 'Amount of sBTC to withdraw (e.g. 0.001)' },
          network: { type: 'string', enum: ['testnet', 'mainnet'] },
        },
        required: ['amount'],
      },
    },
    {
      name: 'stacks_vault_info',
      description: 'Get vault balance and total value locked for an address',
      inputSchema: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'Stacks address to query (optional)' },
          network: { type: 'string', enum: ['testnet', 'mainnet'] },
        },
        required: [],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params

  try {
    switch (name) {
      case 'stacks_get_balance': {
        const input = GetBalanceInput.parse(args)
        const result = await getBalance(input.address, input.network as NetworkType)
        const stx = (BigInt(result.stx) / 1_000_000n).toString()
        const locked = (BigInt(result.locked) / 1_000_000n).toString()
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ address: input.address, stx, locked, network: input.network }),
            },
          ],
        }
      }

      case 'stacks_deploy_contract': {
        const input = DeployContractInput.parse(args)
        requireExec('deploy')
        const txid = await deployContract(input.contractCode, input.contractName, input.network as NetworkType)
        return {
          content: [{ type: 'text', text: JSON.stringify({ txid, contractName: input.contractName }) }],
        }
      }

      case 'stacks_call_contract': {
        const input = CallContractInput.parse(args)
        requireExec('call')
        const txid = await callContract(input.contract, input.function, input.args, input.network as NetworkType)
        return {
          content: [{ type: 'text', text: JSON.stringify({ txid, contract: input.contract, function: input.function }) }],
        }
      }

      case 'stacks_sbtc_deposit': {
        const input = SbtcDepositInput.parse(args)
        requireExec('sbtc')
        const txid = await sbtcDeposit(input.amount, input.recipient, input.network as NetworkType)
        return {
          content: [{ type: 'text', text: JSON.stringify({ txid, amount: input.amount }) }],
        }
      }

      case 'stacks_vault_deposit': {
        const input = VaultDepositInput.parse(args)
        requireExec('vault')
        const txid = await vaultDeposit(input.amount, input.network as NetworkType)
        return {
          content: [{ type: 'text', text: JSON.stringify({ txid, amount: input.amount }) }],
        }
      }

      case 'stacks_vault_withdraw': {
        const input = VaultWithdrawInput.parse(args)
        requireExec('vault')
        const txid = await vaultWithdraw(input.amount, input.network as NetworkType)
        return {
          content: [{ type: 'text', text: JSON.stringify({ txid, amount: input.amount }) }],
        }
      }

      case 'stacks_vault_info': {
        const input = VaultInfoInput.parse(args)
        const result = await vaultInfo(input.address, input.network as NetworkType)
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('stacks-cli MCP server running on stdio')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
