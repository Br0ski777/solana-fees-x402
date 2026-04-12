import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "solana-fees",
  slug: "solana-fees",
  description: "Solana priority fee estimates at 6 levels for every transaction.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/fees",
      price: "$0.001",
      description: "Priority fee estimates for Solana transactions",
      toolName: "solana_get_priority_fees",
      toolDescription:
        "Use this when you need priority fee estimates before sending a Solana transaction. Returns recommended compute unit price at 6 levels (min/low/medium/high/veryHigh/max) based on recent network activity. Essential for every Solana transaction. Do NOT use for EVM gas — use gas_get_current_price. Do NOT use for swap quotes — use dex_get_swap_quote.",
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
    },
  ],
};
