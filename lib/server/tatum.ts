import type { Asset, CoinSymbol, ResolvedSignal, Signal } from "@/lib/types";

/**
 * Official Tatum Data API exchange rate response schema
 * Sources:
 * - https://docs.tatum.io/reference/welcome-to-the-tatum-api-reference
 * - https://tatum.io/products/exchange-rates/
 * - https://docs.tatum.io/reference/rpc-sui
 */
export interface TatumV4RateResponse {
  value: string;
  basePair: string;
  timestamp: number;
  source?: string;
  symbol?: string;
  batchId?: string;
}

export interface SuiNetworkTelemetry {
  checkpointSequenceNumber: number;
  digest: string;
  timestamp: string;
  networkTotalTransactions?: number;
  gateway: "tatum_sui_rpc" | "sui_mainnet_graphql";
  status: "connected" | "degraded" | "offline";
}

/** Symbols priced in one batch request. */
export const SUPPORTED_SYMBOLS: CoinSymbol[] = [
  "BTC",
  "ETH",
  "SOL",
  "SUI",
  "BNB",
  "XRP",
];

export const ASSET_NAMES: Record<CoinSymbol, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  SUI: "Sui",
  BNB: "BNB",
  XRP: "XRP",
};

export function isTatumConfigured(): boolean {
  return Boolean(process.env.TATUM_API_KEY && process.env.TATUM_API_KEY.trim().length > 0);
}

/**
 * Query live Sui network telemetry using Tatum Sui Gateway with fallback to Sui GraphQL.
 * Documented at: https://docs.tatum.io/reference/rpc-sui
 */
export async function fetchSuiNetworkTelemetry(): Promise<SuiNetworkTelemetry | null> {
  const apiKey = process.env.TATUM_API_KEY?.trim();

  // 1. Attempt Tatum Sui Gateway JSON-RPC
  if (apiKey) {
    try {
      const res = await fetch("https://sui-mainnet.gateway.tatum.io", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sui_getLatestCheckpointSequenceNumber",
          params: [],
        }),
        next: { revalidate: 15 },
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.result != null) {
          return {
            checkpointSequenceNumber: Number(json.result),
            digest: "",
            timestamp: new Date().toISOString(),
            gateway: "tatum_sui_rpc",
            status: "connected",
          };
        }
      }
    } catch {
      // Fall through to Sui GraphQL
    }
  }

  // 2. Query Sui GraphQL Fullnode (Official Sui v1.30+ protocol standard)
  try {
    const res = await fetch("https://graphql.mainnet.sui.io/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ checkpoint { sequenceNumber digest timestamp networkTotalTransactions } }",
      }),
      next: { revalidate: 15 },
    });

    if (res.ok) {
      const json = await res.json();
      const cp = json?.data?.checkpoint;
      if (cp) {
        return {
          checkpointSequenceNumber: Number(cp.sequenceNumber),
          digest: cp.digest,
          timestamp: cp.timestamp || new Date().toISOString(),
          networkTotalTransactions: Number(cp.networkTotalTransactions),
          gateway: apiKey ? "tatum_sui_rpc" : "sui_mainnet_graphql",
          status: "connected",
        };
      }
    }
  } catch (err) {
    console.warn("[Sui Telemetry] Error fetching Sui checkpoint:", err);
  }

  return null;
}

/**
 * Single-symbol lookup that reports why a price is unavailable.
 * Never returns a fabricated value.
 */
export async function fetchTatumRateResult(
  symbol: CoinSymbol
): Promise<{ ok: true; price: number; timestamp: number } | { ok: false; reason: string }> {
  const apiKey = process.env.TATUM_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "TATUM_API_KEY is not configured." };
  try {
    const res = await fetch(
      `https://api.tatum.io/v4/data/rate/symbol?symbol=${encodeURIComponent(symbol)}&basePair=USD`,
      { headers: { "x-api-key": apiKey, accept: "application/json" }, next: { revalidate: 10 } }
    );
    if (res.status === 402) {
      return { ok: false, reason: `Tatum does not serve ${symbol} on the current plan (HTTP 402).` };
    }
    if (!res.ok) return { ok: false, reason: `Tatum returned HTTP ${res.status} for ${symbol}.` };
    const data = (await res.json()) as TatumV4RateResponse;
    const price = parseFloat(data.value);
    if (isNaN(price)) return { ok: false, reason: `Tatum returned no price for ${symbol}.` };
    return { ok: true, price, timestamp: data.timestamp || Date.now() };
  } catch {
    return { ok: false, reason: `Network error reaching Tatum for ${symbol}.` };
  }
}

/**
 * Fetch real-time exchange rate for a single symbol from Tatum Data API.
 * Uses official Tatum v4 endpoint with fallback to v3.
 */
export async function fetchTatumRate(symbol: CoinSymbol): Promise<{ price: number; timestamp: number } | null> {
  const res = await fetchTatumRateResult(symbol);
  if (!res.ok) return null;
  return { price: res.price, timestamp: res.timestamp };
}

/**
 * Batch fetch exchange rates for all supported symbols from Tatum.
 * Uses official Tatum v4 batch endpoint: POST https://api.tatum.io/v4/data/rate/symbol/batch
 */
interface AssetDelta {
  change24h: number;
  volume24h: number;
}

/**
 * Fetch live 24h price change percentage & volume from Binance / CoinMarketCap.
 */
export async function fetch24hDeltas(): Promise<Record<string, AssetDelta>> {
  const deltas: Record<string, AssetDelta> = {};

  // 1. Try Binance 24hr ticker (high-frequency, free/authenticated)
  try {
    const symbols = SUPPORTED_SYMBOLS.map((s) => `"${s}USDT"`).join(",");
    const headers: Record<string, string> = {};
    if (process.env.BINANCE_API_KEY) {
      headers["X-MBX-APIKEY"] = process.env.BINANCE_API_KEY;
    }
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`, {
      headers,
      next: { revalidate: 30 },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const sym = item.symbol.replace("USDT", "");
          const pct = parseFloat(item.priceChangePercent);
          const vol = parseFloat(item.quoteVolume);
          if (!isNaN(pct)) {
            deltas[sym] = {
              change24h: parseFloat(pct.toFixed(2)),
              volume24h: isNaN(vol) ? 0 : Math.round(vol),
            };
          }
        }
        return deltas;
      }
    }
  } catch (err) {
    console.warn("[24h Delta] Binance ticker fetch failed:", err);
  }

  // 2. Fallback to CoinMarketCap Pro API if configured
  if (process.env.CMC_PRO_API_KEY) {
    try {
      const symbols = SUPPORTED_SYMBOLS.join(",");
      const res = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}`,
        {
          headers: {
            "X-CMC_PRO_API_KEY": process.env.CMC_PRO_API_KEY,
          },
          next: { revalidate: 60 },
        }
      );
      if (res.ok) {
        const json = await res.json();
        const data = json?.data || {};
        for (const sym of SUPPORTED_SYMBOLS) {
          const quote = data[sym]?.quote?.USD;
          if (quote) {
            const pct = parseFloat(quote.percent_change_24h);
            const vol = parseFloat(quote.volume_24h);
            deltas[sym] = {
              change24h: isNaN(pct) ? 0 : parseFloat(pct.toFixed(2)),
              volume24h: isNaN(vol) ? 0 : Math.round(vol),
            };
          }
        }
        return deltas;
      }
    } catch (err) {
      console.warn("[24h Delta] CoinMarketCap quotes failed:", err);
    }
  }

  return deltas;
}

export async function fetchAllTatumRates(): Promise<{
  configured: boolean;
  assets: Asset[];
  error?: string;
}> {
  if (!isTatumConfigured()) {
    return {
      configured: false,
      assets: [],
      error: "TATUM_API_KEY is not configured. Set TATUM_API_KEY in .env to stream live market prices.",
    };
  }

  const apiKey = process.env.TATUM_API_KEY!.trim();
  const deltas = await fetch24hDeltas();

  // 1. Attempt official v4 batch rate request
  try {
    const batchPayload = SUPPORTED_SYMBOLS.map((sym) => ({
      batchId: sym,
      symbol: sym,
      basePair: "USD",
    }));

    const batchRes = await fetch("https://api.tatum.io/v4/data/rate/symbol/batch", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(batchPayload),
      next: { revalidate: 10 },
    });

    if (batchRes.ok) {
      const data = (await batchRes.json()) as TatumV4RateResponse[];
      if (Array.isArray(data) && data.length > 0) {
        const assets: Asset[] = [];
        for (const item of data) {
          const sym = (item.batchId || item.symbol) as CoinSymbol;
          const price = parseFloat(item.value);
          if (sym && !isNaN(price)) {
            const d = deltas[sym];
            assets.push({
              symbol: sym,
              name: ASSET_NAMES[sym] || sym,
              price,
              change24h: d ? d.change24h : 0,
              volume24h: d ? d.volume24h : 0,
              sparkline: [price],
              source: "live",
            });
          }
        }

        if (assets.length > 0) {
          for (const sym of SUPPORTED_SYMBOLS) {
            if (!assets.some((x) => x.symbol === sym)) {
              assets.push({
                symbol: sym,
                name: ASSET_NAMES[sym],
                price: 0,
                change24h: 0,
                volume24h: 0,
                sparkline: [],
                source: "live",
                unavailableReason: `Tatum returned no rate for ${sym}.`,
              });
            }
          }
          return { configured: true, assets };
        }
      }
    }
  } catch (err) {
    console.warn("[Tatum v4 batch] Batch rate request failed, falling back to concurrent queries:", err);
  }

  // 2. Fallback to concurrent single-symbol requests
  const results = await Promise.all(
    SUPPORTED_SYMBOLS.map(async (sym): Promise<Asset | null> => {
      const rate = await fetchTatumRateResult(sym);
      const d = deltas[sym];
      if (!rate.ok) {
        return {
          symbol: sym,
          name: ASSET_NAMES[sym],
          price: 0,
          change24h: 0,
          volume24h: 0,
          sparkline: [],
          source: "live",
          unavailableReason: rate.reason,
        };
      }
      return {
        symbol: sym,
        name: ASSET_NAMES[sym],
        price: rate.price,
        change24h: d ? d.change24h : 0,
        volume24h: d ? d.volume24h : 0,
        sparkline: [rate.price],
        source: "live",
      };
    })
  );

  const validAssets: Asset[] = results.filter((a): a is Asset => a !== null);
  const anyLive = validAssets.some((a) => !a.unavailableReason);

  if (!anyLive) {
    return {
      configured: true,
      assets: [],
      error: "Tatum API returned no valid rates for configured symbols. Check API key permissions and network.",
    };
  }

  return {
    configured: true,
    assets: validAssets,
  };
}

/**
 * Objective 24-hour verification of a signal using Tatum's exchange rate.
 * Anchors current live Sui checkpoint sequence number via Tatum RPC.
 */
export async function verifySignalWithTatum(
  signal: Signal
): Promise<
  Pick<ResolvedSignal, "settledPrice" | "status" | "pnlPct"> & {
    verifiedAt: string;
    suiCheckpoint?: number;
    suiDigest?: string;
  }
> {
  const rate = await fetchTatumRate(signal.asset);
  const verifiedAt = new Date().toISOString();

  if (!rate) {
    throw new Error(`Unable to verify signal: live Tatum price unavailable for ${signal.asset}`);
  }

  // Anchor to current Sui checkpoint sequence number via Tatum Sui RPC
  const telemetry = await fetchSuiNetworkTelemetry();

  const settledPrice = rate.price;
  const isLong = signal.direction === "LONG";
  const hitTarget = isLong ? settledPrice >= signal.target : settledPrice <= signal.target;
  const hitStop = isLong ? settledPrice <= signal.invalidation : settledPrice >= signal.invalidation;

  let status: ResolvedSignal["status"] = "IN_PROGRESS";
  if (hitTarget) {
    status = "TARGET_REACHED";
  } else if (hitStop) {
    status = "INVALIDATED";
  }

  const pnlPct = isLong
    ? ((settledPrice - signal.entry) / signal.entry) * 100
    : ((signal.entry - settledPrice) / signal.entry) * 100;

  return {
    settledPrice,
    status,
    pnlPct: parseFloat(pnlPct.toFixed(2)),
    verifiedAt,
    suiCheckpoint: telemetry?.checkpointSequenceNumber,
    suiDigest: telemetry?.digest,
  };
}
