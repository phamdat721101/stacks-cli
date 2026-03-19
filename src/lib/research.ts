import Anthropic from '@anthropic-ai/sdk'
import { getBalance, vaultInfo } from './services.js'
import { appendFileSync, existsSync } from 'fs'
import type { NetworkType } from '../auth/wallet.js'
import 'dotenv/config'

export interface ResearchResult {
  timestamp: string
  iteration: number
  metric: number
  summary: string
  kept: boolean
}

const DEFAULT_STRATEGY = `Monitor Stacks blockchain state:
- Vault TVL changes (metric: total locked satoshis)
- STX balance changes
Keep if metric changed > 1% from previous or significant event detected.`

const researchTools: Anthropic.Tool[] = [
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

async function gatherState(address: string, network: NetworkType): Promise<string> {
  const [balance, vault] = await Promise.all([
    getBalance(address, network),
    vaultInfo(address, network),
  ])
  const vaultTVLSatoshis = Math.round(parseFloat(vault.totalValue) * 100_000_000)
  return JSON.stringify({
    stxBalance: balance.stx,
    stxLocked: balance.locked,
    vaultUserBalance: vault.balance,
    vaultTVL: vault.totalValue,
    vaultTVLSatoshis,
  })
}

async function analyzeWithClaude(
  strategy: string,
  state: string,
  iteration: number
): Promise<{ metric: number; summary: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const prompt = `You are a Stacks blockchain researcher. Strategy: ${strategy}

Current state (iteration ${iteration}):
${state}

Analyze the on-chain state. Respond with exactly two lines:
METRIC: <vault TVL in satoshis as integer>
SUMMARY: <one sentence analysis>`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  while (true) {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      tools: researchTools,
      messages,
    })

    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason !== 'tool_use') {
      const textBlock = response.content.find(b => b.type === 'text')
      const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
      const metricMatch = text.match(/METRIC:\s*(\d+)/)
      const summaryMatch = text.match(/SUMMARY:\s*(.+)/)
      return {
        metric: metricMatch ? parseInt(metricMatch[1], 10) : 0,
        summary: summaryMatch ? summaryMatch[1].trim() : text.slice(0, 120),
      }
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      const args = block.input as Record<string, unknown>
      let result: string
      try {
        if (block.name === 'stacks_get_balance') {
          const bal = await getBalance(
            args.address as string,
            (args.network as NetworkType) ?? 'testnet'
          )
          result = JSON.stringify(bal)
        } else if (block.name === 'stacks_vault_info') {
          const info = await vaultInfo(
            args.address as string | undefined,
            (args.network as NetworkType) ?? 'testnet'
          )
          result = JSON.stringify(info)
        } else {
          result = `Unknown tool: ${block.name}`
        }
      } catch (err) {
        result = `Error: ${err instanceof Error ? err.message : String(err)}`
      }
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
    }
    messages.push({ role: 'user', content: toolResults })
  }
}

function appendLog(logFile: string, result: ResearchResult): void {
  const header = 'timestamp\titeration\tmetric\tsummary\tkept\n'
  const line = `${result.timestamp}\t${result.iteration}\t${result.metric}\t${result.summary}\t${result.kept}\n`
  if (!existsSync(logFile)) {
    appendFileSync(logFile, header)
  }
  appendFileSync(logFile, line)
}

export async function runResearchLoop(opts: {
  strategy: string
  iterations: number
  intervalSec: number
  address: string
  logFile: string
  network: NetworkType
}): Promise<void> {
  const strategy = opts.strategy || DEFAULT_STRATEGY
  let previousMetric = -1

  for (let i = 0; i < opts.iterations; i++) {
    console.log(`\n[Iteration ${i + 1}/${opts.iterations}] Gathering state...`)
    const state = await gatherState(opts.address, opts.network)
    const { metric, summary } = await analyzeWithClaude(strategy, state, i)
    const kept = i === 0 || metric !== previousMetric
    const result: ResearchResult = {
      timestamp: new Date().toISOString(),
      iteration: i,
      metric,
      summary,
      kept,
    }
    appendLog(opts.logFile, result)
    console.log(`  Metric: ${metric} satoshis`)
    console.log(`  Summary: ${summary}`)
    console.log(`  Kept: ${kept}`)
    previousMetric = metric

    if (i < opts.iterations - 1) {
      console.log(`  Waiting ${opts.intervalSec}s...`)
      await new Promise(resolve => setTimeout(resolve, opts.intervalSec * 1000))
    }
  }

  console.log(`\nResearch complete. Log saved to ${opts.logFile}`)
}
