# Solana Priority Fee Estimator API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://solana-fees.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Solana priority fee estimates at 6 levels (min to max). Essential for every Solana transaction. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "solana-fees": {
      "url": "https://solana-fees.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://solana-fees.api.klymax402.com/api/fees"
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `solana_get_priority_fees` | GET | `/api/fees` | $0.001 | Priority fee estimates for Solana transactions |

### `solana_get_priority_fees`

Use this when you need priority fee estimates before sending a Solana transaction. Returns recommended compute unit prices at 6 levels based on recent network activity.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `program` | string | no | Program ID to get program-specific fees (e.g. JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 for Jupiter). Optional — omit for global fees. |

**Returns**

- `fees` -- object with 6 fee levels in microlamports per compute unit
- `min` -- minimum fee observed (cheapest, may fail in congestion)
- `low` -- 25th percentile fee (budget transactions)
- `medium` -- 50th percentile fee (recommended default)
- `high` -- 75th percentile fee (fast confirmation)
- `veryHigh` -- 90th percentile fee (priority during congestion)
- `max` -- maximum fee observed (guaranteed fast)

Example response:

```json
{"fees":{"min":1,"low":100,"medium":1000,"high":5000,"veryHigh":50000,"max":500000},"slot":285432100,"program":"global","updatedAt":"2026-04-13T12:00:00Z"}
```

**When to use**: every Solana transaction to set the right priority fee. Essential for Jupiter swaps, NFT mints, token transfers, and program interactions.

## Example agent prompts

- "Priority fee estimates before sending a Solana transaction"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
