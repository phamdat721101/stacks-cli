# stacks-cli

A MCP-native CLI for the Stacks blockchain — interact with Stacks via terminal commands or let an AI agent (Gemini / Claude) do it for you.

**GitHub:** https://github.com/phamdat721101/stacks-cli

---

## Features

- Query STX balances
- Deploy Clarity smart contracts
- Call smart contract functions
- Stack STX (PoX)
- sBTC deposit and withdrawal
- **Dual AI agent** — supports both Google Gemini 2.0 Flash and Anthropic Claude (auto-detected from env)
- **MCP server** — exposes all tools to Claude Desktop and other MCP clients

---

## Prerequisites

- Node.js >= 20
- npm >= 9

---

## Installation

**From GitHub (global install):**
```bash
npm install -g https://github.com/phamdat721101/stacks-cli.git
```

**From source:**
```bash
git clone https://github.com/phamdat721101/stacks-cli.git
cd stacks-cli
npm install
npm run build
npm link
```

---

## Environment Variables

| Variable | Required for | Description |
|---|---|---|
| `STACKS_PRIVATE_KEY` | write operations | 64-character hex private key |
| `ENABLE_EXEC=true` | write operations | Safety gate — must be set to allow transactions |
| `ANTHROPIC_API_KEY` | agent (Claude) | Anthropic API key |
| `GEMINI_API_KEY` | agent (Gemini) | Google Gemini API key |

Create a `.env` file in the project root or export these in your shell.

---

## Commands

### `stacks balance`

Query the STX balance of an address.

| Flag | Required | Description |
|---|---|---|
| `-a, --address` | yes | Stacks address to query |
| `-n, --network` | no | `testnet` (default) or `mainnet` |

```bash
stacks balance -a ST1PY8K93CXJ4925VE7EGF2NVP1H2ZHEK4R6Y0DD3
stacks balance -a ST1... -n mainnet
```

---

### `stacks deploy`

Deploy a Clarity smart contract.

| Flag | Required | Description |
|---|---|---|
| `-c, --contractCode` | yes | Path to `.clar` file |
| `-n, --contractName` | yes | Contract name |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks deploy -c ./contracts/hello.clar -n hello-world
```

---

### `stacks call`

Call a public function on a deployed contract.

| Flag | Required | Description |
|---|---|---|
| `--contract` | yes | Contract in `address.name` format |
| `--function` | yes | Function name |
| `--args` | no | Comma-separated arguments |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks call --contract ST1...hello-world --function say-hi
```

---

### `stacks stack`

Stack STX via PoX.

| Flag | Required | Description |
|---|---|---|
| `--amount` | yes | Amount in µSTX |
| `--cycles` | yes | Number of cycles |
| `--poxAddress` | yes | BTC address for rewards |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks stack --amount 1000000 --cycles 1 --poxAddress bc1q...
```

---

### `stacks sbtc:deposit`

Deposit BTC to receive sBTC.

| Flag | Required | Description |
|---|---|---|
| `--amount` | yes | Amount in BTC (e.g. `0.001`) |
| `--recipient` | no | Stacks address to receive sBTC (defaults to wallet address) |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks sbtc:deposit --amount 0.001
```

---

### `stacks sbtc:withdraw`

Withdraw sBTC back to BTC.

| Flag | Required | Description |
|---|---|---|
| `--amount` | yes | Amount in sBTC |
| `--btcAddress` | yes | BTC address to receive funds |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks sbtc:withdraw --amount 0.001 --btcAddress bc1q...
```

---

### `stacks agent:run`

Run an AI agent that interprets natural language and executes Stacks operations.

Auto-detects provider: Claude if `ANTHROPIC_API_KEY` is set, otherwise Gemini.

| Flag | Required | Description |
|---|---|---|
| `--prompt` | yes | Natural language instruction |
| `--provider` | no | `gemini` or `claude` (overrides auto-detect) |
| `-n, --network` | no | `testnet` (default) or `mainnet` |

```bash
# Auto-detect (Claude if ANTHROPIC_API_KEY set, else Gemini)
stacks agent:run --prompt "Check balance of ST1PY8K93CXJ4925VE7EGF2NVP1H2ZHEK4R6Y0DD3"

# Force Claude
stacks agent:run --prompt "What is the STX balance of ST1..." --provider claude

# Force Gemini
stacks agent:run --prompt "Deploy my contract" --provider gemini
```

---

## MCP Server

The MCP server exposes Stacks tools to Claude Desktop and other MCP clients.

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stacks": {
      "command": "node",
      "args": ["/absolute/path/to/stacks-cli/dist/mcp/server.js"],
      "env": {
        "STACKS_PRIVATE_KEY": "your-private-key",
        "ENABLE_EXEC": "true"
      }
    }
  }
}
```

Available MCP tools: `stacks_get_balance`, `stacks_deploy_contract`, `stacks_call_contract`, `stacks_sbtc_deposit`

---

## Rate Limits & Safety

- Maximum 10 transactions per minute (enforced client-side)
- Maximum transaction value: 1,000,000 µSTX
- Write operations require both `STACKS_PRIVATE_KEY` and `ENABLE_EXEC=true`

---

## License

MIT
