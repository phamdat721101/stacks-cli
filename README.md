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
- **sBTC vault** — deposit and withdraw sBTC through a Clarity vault contract
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
| `STACKS_NETWORK` | all commands | `testnet` (default) or `mainnet` |
| `ENABLE_EXEC=true` | write operations | Safety gate — must be set to allow transactions |
| `ANTHROPIC_API_KEY` | agent (Claude) | Anthropic API key |
| `GEMINI_API_KEY` | agent (Gemini) | Google Gemini API key |
| `VAULT_CONTRACT` | vault commands | Deployed vault contract in `address.contract-name` format |

Create a `.env` file in the project root or export these in your shell.

---

## Full Vault Flow

End-to-end walkthrough on testnet.

### Step 1 — Configure `.env`

```
STACKS_PRIVATE_KEY=<your-64-char-hex-key>
STACKS_NETWORK=testnet
ENABLE_EXEC=true
```

### Step 2 — Deploy `vault.clar`

```bash
stacks deploy -c ./vault.clar -n sbtc-vault
```

The command prints the transaction ID and the deployer address. Wait for the transaction to confirm on-chain (usually a few minutes on testnet).

### Step 3 — Set `VAULT_CONTRACT` in `.env`

```
VAULT_CONTRACT=<deployer-address>.sbtc-vault
```

Replace `<deployer-address>` with the address printed in step 2.

### Step 4 — Smoke test with `vault:info`

```bash
stacks vault:info
```

Returns the current total deposits and sBTC contract address. No transaction is sent.

### Step 5 — Deposit sBTC

```bash
ENABLE_EXEC=true stacks vault:deposit --amount 0.001
```

### Step 6 — Withdraw sBTC

```bash
ENABLE_EXEC=true stacks vault:withdraw --amount 0.001
```

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

### `stacks vault:deposit`

Deposit sBTC into the vault contract.

Requires `VAULT_CONTRACT` to be set (see [Full Vault Flow](#full-vault-flow)).

| Flag | Required | Description |
|---|---|---|
| `--amount` | yes | Amount in sBTC (e.g. `0.001`) |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks vault:deposit --amount 0.001
```

---

### `stacks vault:withdraw`

Withdraw sBTC from the vault contract.

| Flag | Required | Description |
|---|---|---|
| `--amount` | yes | Amount in sBTC (e.g. `0.001`) |
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
ENABLE_EXEC=true stacks vault:withdraw --amount 0.001
```

---

### `stacks vault:info`

Read vault state (total deposits, sBTC contract address). Read-only — no transaction sent.

| Flag | Required | Description |
|---|---|---|
| `--network` | no | `testnet` (default) or `mainnet` |

```bash
stacks vault:info
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

# Vault operations via agent
stacks agent:run --prompt "Deposit 0.001 sBTC into the vault"
stacks agent:run --prompt "How much sBTC is in the vault?"
```

The agent has access to all CLI tools including the vault tools (`stacks_vault_deposit`, `stacks_vault_withdraw`, `stacks_vault_info`).

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
        "ENABLE_EXEC": "true",
        "VAULT_CONTRACT": "your-deployer-address.sbtc-vault"
      }
    }
  }
}
```

Available MCP tools:

| Tool | Description |
|---|---|
| `stacks_get_balance` | Query STX balance |
| `stacks_deploy_contract` | Deploy a Clarity contract |
| `stacks_call_contract` | Call a contract function |
| `stacks_sbtc_deposit` | Deposit BTC for sBTC |
| `stacks_vault_deposit` | Deposit sBTC into the vault |
| `stacks_vault_withdraw` | Withdraw sBTC from the vault |
| `stacks_vault_info` | Read vault state |

---

## Rate Limits & Safety

- Maximum 10 transactions per minute (enforced client-side)
- Maximum transaction value: 1,000,000 µSTX
- Write operations require both `STACKS_PRIVATE_KEY` and `ENABLE_EXEC=true`

---

## License

MIT
