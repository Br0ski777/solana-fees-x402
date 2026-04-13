import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "solana-fees",
  slug: "solana-fees",
  description: "Solana priority fee estimates at 6 levels (min to max). Essential for every Solana transaction.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/fees",
      price: "$0.001",
      description: "Priority fee estimates for Solana transactions",
      toolName: "solana_get_priority_fees",
      toolDescription: `Use this when you need priority fee estimates before sending a Solana transaction. Returns recommended compute unit prices at 6 levels based on recent network activity.

1. fees: object with 6 fee levels in microlamports per compute unit
2. min: minimum fee observed (cheapest, may fail in congestion)
3. low: 25th percentile fee (budget transactions)
4. medium: 50th percentile fee (recommended default)
5. high: 75th percentile fee (fast confirmation)
6. veryHigh: 90th percentile fee (priority during congestion)
7. max: maximum fee observed (guaranteed fast)

Example output: {"fees":{"min":1,"low":100,"medium":1000,"high":5000,"veryHigh":50000,"max":500000},"slot":285432100,"program":"global","updatedAt":"2026-04-13T12:00:00Z"}

Use this BEFORE every Solana transaction to set the right priority fee. Essential for Jupiter swaps, NFT mints, token transfers, and program interactions.

Do NOT use for EVM gas -- use gas_get_current_price. Do NOT use for swap quotes -- use jupiter_get_swap_quote. Do NOT use for wallet balance -- use wallet_get_portfolio.`,
      inputSchema: {
        type: "object",
        properties: {
          program: {
            type: "string",
            description:
              "Program ID to get program-specific fees (e.g. JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 for Jupiter). Optional — omit for global fees.",
          },
        },
      },
      outputSchema: {
          "type": "object",
          "properties": {
            "chain": {
              "type": "string",
              "description": "Chain (solana)"
            },
            "priorityFees": {
              "type": "object",
              "properties": {
                "min": {
                  "type": "number"
                },
                "low": {
                  "type": "number"
                },
                "medium": {
                  "type": "number"
                },
                "high": {
                  "type": "number"
                },
                "veryHigh": {
                  "type": "number"
                },
                "max": {
                  "type": "number"
                }
              },
              "description": "Priority fee levels in microLamports"
            },
            "baseFee": {
              "type": "number",
              "description": "Base fee in lamports"
            },
            "recentSlot": {
              "type": "number"
            },
            "timestamp": {
              "type": "string"
            }
          },
          "required": [
            "priorityFees"
          ]
        },
    },
  ],
};
