import { Command, Flags } from '@oclif/core'
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai'
import { getBalance, deployContract, callContract, sbtcDeposit } from '../../lib/services.js'
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
      default:
        return `Unknown tool: ${name}`
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`
  }
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
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentRun)

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      this.error('GEMINI_API_KEY environment variable is not set')
    }

    const ai = new GoogleGenAI({ apiKey })
    this.log(`Agent: Processing "${flags.prompt}"...`)

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
