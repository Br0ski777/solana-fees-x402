import type { Hono } from "hono";

// --- Cache ---
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data as T;
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// --- Solana RPC ---
const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

async function solanaRpc(method: string, params: any[] = []): Promise<any> {
  const resp = await fetch(SOLANA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Solana RPC error ${resp.status}: ${text}`);
  }
  const json = await resp.json();
  if (json.error) throw new Error(`Solana RPC: ${json.error.message}`);
  return json.result;
}

// --- SOL price cache (CoinGecko) ---
async function getSolPrice(): Promise<number> {
  const cacheKey = "sol_price_usd";
  const cached = getCached<number>(cacheKey, 60_000);
  if (cached !== null) return cached;

  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
    const data = await resp.json();
    const price = data?.solana?.usd ?? 150;
    setCache(cacheKey, price);
    return price;
  } catch {
    return 150; // fallback
  }
}

// --- Known program compute unit limits ---
const PROGRAM_CU_LIMITS: Record<string, number> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 400_000, // Jupiter
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": 300_000, // Raydium AMM
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 350_000, // Orca Whirlpool
  TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN: 300_000, // Tensor Swap
  M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K: 250_000, // Magic Eden v2
};
const DEFAULT_CU_LIMIT = 200_000;

// --- Percentile calculation ---
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// --- Congestion level ---
function congestionLevel(medianFee: number): "low" | "medium" | "high" {
  if (medianFee < 1_000) return "low";
  if (medianFee < 50_000) return "medium";
  return "high";
}

export function registerRoutes(app: Hono) {
  app.get("/api/fees", async (c) => {
    const program = c.req.query("program");

    const cacheKey = `fees_${program || "global"}`;
    const cached = getCached<any>(cacheKey, 5_000);
    if (cached) return c.json(cached);

    try {
      // Fetch recent prioritization fees
      const params: any[] = program ? [[program]] : [[]];
      const rawFees = await solanaRpc("getRecentPrioritizationFees", params);

      if (!Array.isArray(rawFees) || rawFees.length === 0) {
        return c.json({ error: "No recent fee data available from Solana RPC" }, 502);
      }

      // Extract fees and sort
      const fees = rawFees
        .map((entry: any) => entry.prioritizationFee as number)
        .filter((f: number) => f >= 0);
      fees.sort((a: number, b: number) => a - b);

      // Non-zero fees for percentile calculation
      const nonZeroFees = fees.filter((f: number) => f > 0);
      const feesForCalc = nonZeroFees.length > 0 ? nonZeroFees : fees;

      // Calculate levels in micro-lamports per compute unit
      const levels = {
        min: Math.max(feesForCalc[0] || 0, 1),
        low: Math.max(percentile(feesForCalc, 25), 1),
        medium: Math.max(percentile(feesForCalc, 50), 100),
        high: Math.max(percentile(feesForCalc, 75), 1_000),
        veryHigh: Math.max(percentile(feesForCalc, 90), 10_000),
        max: Math.max(feesForCalc[feesForCalc.length - 1] || 0, 100_000),
      };

      // Determine compute unit limit
      const cuLimit = program ? PROGRAM_CU_LIMITS[program] || DEFAULT_CU_LIMIT : DEFAULT_CU_LIMIT;

      // Calculate estimated cost in SOL for the "medium" level
      // priorityFee (microlamports/CU) * CU / 1e6 = lamports, / 1e9 = SOL
      const mediumLamports = (levels.medium * cuLimit) / 1_000_000;
      const estimatedCostSol = mediumLamports / 1_000_000_000;

      // Fetch SOL price
      const solPrice = await getSolPrice();
      const estimatedCostUsd = estimatedCostSol * solPrice;

      // Find the latest slot sampled
      const slots = rawFees.map((e: any) => e.slot as number);
      const latestSlot = Math.max(...slots);

      const congestion = congestionLevel(levels.medium);

      const result = {
        program: program || null,
        levels: {
          min: { microLamportsPerCU: levels.min, description: "Minimum observed fee" },
          low: { microLamportsPerCU: levels.low, description: "25th percentile — economy" },
          medium: { microLamportsPerCU: levels.medium, description: "50th percentile — recommended" },
          high: { microLamportsPerCU: levels.high, description: "75th percentile — fast" },
          veryHigh: { microLamportsPerCU: levels.veryHigh, description: "90th percentile — urgent" },
          max: { microLamportsPerCU: levels.max, description: "Maximum observed fee" },
        },
        recommendedComputeUnitLimit: cuLimit,
        estimatedCost: {
          level: "medium",
          computeUnits: cuLimit,
          priorityFeeLamports: mediumLamports,
          sol: parseFloat(estimatedCostSol.toFixed(9)),
          usd: parseFloat(estimatedCostUsd.toFixed(6)),
          solPriceUsd: solPrice,
        },
        networkCongestion: congestion,
        slotSampled: latestSlot,
        sampleSize: rawFees.length,
        nonZeroSamples: nonZeroFees.length,
        timestamp: Date.now(),
      };

      setCache(cacheKey, result);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: "Failed to fetch priority fees", details: err.message }, 502);
    }
  });
}
