import { Command, Flags } from '@oclif/core'
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import { getBalance, deployContract, callContract, sbtcDeposit, vaultDeposit, vaultWithdraw, vaultInfo } from '../../lib/services.js'
import { requireExec } from '../../lib/guards.js'
import type { NetworkType } from '../../auth/wallet.js'
import 'dotenv/config'

const tools: FunctionDeclaration[] = [
  {
    name: 'stacks_get_balance',
    description: 'Get the STX balance for a Stacks address',
    parameters: {
      type: Type.OBJECT,
      properties: {
        address: { type: Type.STRING, description: 'Stacks address to query' },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: ['address'],
    },
  },
  {
    name: 'stacks_deploy_contract',
    description: 'Deploy a Clarity smart contract to the Stacks blockchain',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contractCode: { type: Type.STRING, description: 'Path to Clarity contract file' },
        contractName: { type: Type.STRING, description: 'Contract name' },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: ['contractCode', 'contractName'],
    },
  },
  {
    name: 'stacks_call_contract',
    description: 'Call a public function on a Clarity smart contract',
    parameters: {
      type: Type.OBJECT,
      properties: {
        contract: { type: Type.STRING, description: 'Contract in "address.name" format' },
        function: { type: Type.STRING, description: 'Function name to call' },
        args: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Function arguments',
        },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: ['contract', 'function'],
    },
  },
  {
    name: 'stacks_sbtc_deposit',
    description: 'Deposit BTC to receive sBTC on the Stacks blockchain',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.STRING, description: 'Amount in BTC (e.g. 0.001)' },
        recipient: { type: Type.STRING, description: 'Stacks address to receive sBTC' },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'stacks_vault_deposit',
    description: 'Deposit sBTC into the sBTC vault',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.STRING, description: 'Amount of sBTC to deposit (e.g. 0.001)' },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'stacks_vault_withdraw',
    description: 'Withdraw sBTC from the sBTC vault',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: { type: Type.STRING, description: 'Amount of sBTC to withdraw (e.g. 0.001)' },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'stacks_vault_info',
    description: 'Get vault balance and total value locked for an address',
    parameters: {
      type: Type.OBJECT,
      properties: {
        address: { type: Type.STRING, description: 'Stacks address to query (optional)' },
        network: { type: Type.STRING, description: 'Network: testnet or mainnet' },
      },
      required: [],
    },
  },
]

const claudeTools: Anthropic.Tool[] = [
  {
    name: 'stacks_get_balance',
    description: 'Get the STX balance for a Stacks address',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Stacks address to query' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: ['address'],
    },
  },
  {
    name: 'stacks_deploy_contract',
    description: 'Deploy a Clarity smart contract to the Stacks blockchain',
    input_schema: {
      type: 'object',
      properties: {
        contractCode: { type: 'string', description: 'Path to Clarity contract file' },
        contractName: { type: 'string', description: 'Contract name' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: ['contractCode', 'contractName'],
    },
  },
  {
    name: 'stacks_call_contract',
    description: 'Call a public function on a Clarity smart contract',
    input_schema: {
      type: 'object',
      properties: {
        contract: { type: 'string', description: 'Contract in "address.name" format' },
        function: { type: 'string', description: 'Function name to call' },
        args: { type: 'array', items: { type: 'string' }, description: 'Function arguments' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: ['contract', 'function'],
    },
  },
  {
    name: 'stacks_sbtc_deposit',
    description: 'Deposit BTC to receive sBTC on the Stacks blockchain',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount in BTC (e.g. 0.001)' },
        recipient: { type: 'string', description: 'Stacks address to receive sBTC' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'stacks_vault_deposit',
    description: 'Deposit sBTC into the sBTC vault',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount of sBTC to deposit (e.g. 0.001)' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'stacks_vault_withdraw',
    description: 'Withdraw sBTC from the sBTC vault',
    input_schema: {
      type: 'object',
      properties: {
        amount: { type: 'string', description: 'Amount of sBTC to withdraw (e.g. 0.001)' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: ['amount'],
    },
  },
  {
    name: 'stacks_vault_info',
    description: 'Get vault balance and total value locked for an address',
    input_schema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Stacks address to query (optional)' },
        network: { type: 'string', description: 'Network: testnet or mainnet' },
      },
      required: [],
    },
  },
]

type ToolArgs = Record<string, unknown>

async function dispatchTool(name: string, args: ToolArgs): Promise<string> {
  try {
    switch (name) {
      case 'stacks_get_balance': {
        const result = await getBalance(
          args.address as string,
          (args.network as NetworkType) ?? 'testnet'
        )
        const stx = (BigInt(result.stx) / 1_000_000n).toString()
        const locked = (BigInt(result.locked) / 1_000_000n).toString()
        return JSON.stringify({ address: args.address, stx, locked })
      }
      case 'stacks_deploy_contract': {
        requireExec('deploy')
        const txid = await deployContract(
          args.contractCode as string,
          args.contractName as string,
          (args.network as NetworkType) ?? 'testnet'
        )
        return JSON.stringify({ txid })
      }
      case 'stacks_call_contract': {
        requireExec('call')
        const txid = await callContract(
          args.contract as string,
          args.function as string,
          (args.args as string[]) ?? [],
          (args.network as NetworkType) ?? 'testnet'
        )
        return JSON.stringify({ txid })
      }
      case 'stacks_sbtc_deposit': {
        requireExec('sbtc')
        const txid = await sbtcDeposit(
          args.amount as string,
          args.recipient as string | undefined,
          (args.network as NetworkType) ?? 'testnet'
        )
        return JSON.stringify({ txid })
      }
      case 'stacks_vault_deposit': {
        requireExec('vault')
        const txid = await vaultDeposit(
          args.amount as string,
          (args.network as NetworkType) ?? 'testnet'
        )
        return JSON.stringify({ txid })
      }
      case 'stacks_vault_withdraw': {
        requireExec('vault')
        const txid = await vaultWithdraw(
          args.amount as string,
          (args.network as NetworkType) ?? 'testnet'
        )
        return JSON.stringify({ txid })
      }
      case 'stacks_vault_info': {
        const network = (args.network as NetworkType) ?? 'testnet'
        const result = await vaultInfo(args.address as string, network)
        return JSON.stringify(result)
      }
      default:
        return `Unknown tool: ${name}`
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
}

async function runWithClaude(prompt: string, network: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      tools: claudeTools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason !== 'tool_use') break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const result = await dispatchTool(block.name, block.input as ToolArgs)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  const last = messages.at(-1)!
  const text = (last.content as Anthropic.ContentBlock[]).find(b => b.type === 'text')
  return text && text.type === 'text' ? text.text : ''
}

export default class AgentRun extends Command {
  static description = 'Run an AI agent to interact with Stacks using natural language'
  static id = 'agent:run'

  static examples = [
    '<%= config.bin %> agent:run --prompt "Check balance of ST1PY8K93CXJ4925VE7EGF2NVP1H2ZHEK4R6Y0DD3"',
  ]

  static flags = {
    prompt: Flags.string({
      description: 'Natural language prompt for the agent',
      required: true,
    }),
    network: Flags.string({
      char: 'n',
      description: 'Default network for operations',
      options: ['testnet', 'mainnet'],
      default: 'testnet',
    }),
    provider: Flags.string({
      description: 'AI provider: gemini or claude (auto-detects from env if omitted)',
      options: ['gemini', 'claude'],
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentRun)

    const provider = flags.provider ?? (process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini')

    this.log(`Agent: Processing "${flags.prompt}"...`)

    if (provider === 'claude') {
      if (!process.env.ANTHROPIC_API_KEY) this.error('ANTHROPIC_API_KEY is not set')
      const result = await runWithClaude(flags.prompt, flags.network)
      this.log(`\nAgent: ${result}`)
    } else {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        this.error('GEMINI_API_KEY environment variable is not set')
      }

      const ai = new GoogleGenAI({ apiKey })

      const chat = ai.chats.create({
        model: 'gemini-2.0-flash',
        config: { tools: [{ functionDeclarations: tools }] },
      })

      let response = await chat.sendMessage({ message: flags.prompt })

      while (response.functionCalls && response.functionCalls.length > 0) {
        const results = []
        for (const call of response.functionCalls) {
          this.log(`\nUsing tool: ${call.name}`)
          const result = await dispatchTool(call.name!, call.args as ToolArgs)
          this.log(`Result: ${result}`)
          results.push({ id: call.id, name: call.name!, response: { output: result } })
        }

        response = await chat.sendMessage({
          message: results.map(r => ({
            functionResponse: { id: r.id, name: r.name, response: r.response },
          })),
        })
      }

      this.log(`\nAgent: ${response.text}`)
    }
  }
}
