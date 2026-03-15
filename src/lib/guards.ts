import 'dotenv/config'

const EXEC_COMMANDS = ['deploy', 'call', 'sbtc', 'stack']

export const RATE_LIMIT = 10 // tx per minute
export const MAX_TX_AMOUNT = 1_000_000 // µSTX

let txCount = 0
let resetTime = Date.now() + 60_000

export function requireExec(command: string): void {
  if (EXEC_COMMANDS.some(cmd => command.includes(cmd)) && !process.env.ENABLE_EXEC) {
    throw new Error(
      `Execution disabled for command "${command}". Set ENABLE_EXEC=true to enable.`
    )
  }
}

export function checkRateLimit(): void {
  const now = Date.now()
  if (now > resetTime) {
    txCount = 0
    resetTime = now + 60_000
  }
  if (txCount >= RATE_LIMIT) {
    throw new Error(`Rate limit exceeded: max ${RATE_LIMIT} transactions per minute`)
  }
  txCount++
}

export function checkAmount(amount: number): void {
  if (amount > MAX_TX_AMOUNT) {
    throw new Error(
      `Amount ${amount} µSTX exceeds maximum allowed ${MAX_TX_AMOUNT} µSTX`
    )
  }
}
