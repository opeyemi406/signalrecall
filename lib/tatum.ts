/**
 * Tatum API client adapter — connects to SignalRecall's server-side Tatum proxy.
 * All API keys are kept strictly server-side.
 */
import type { Asset, Candle, CoinSymbol, ResolvedSignal, Signal } from "@/lib/types";

export interface TatumMarketResponse {
  configured: boolean;
  provider: string;
  assets: Asset[];
  error?: string;
}

export async function getMarketAssets(): Promise<TatumMarketResponse> {
  try {
    const res = await fetch("/api/market/prices", { cache: "no-store" });
    if (!res.ok) {
      return {
        configured: true,
        provider: "tatum",
        assets: [],
        error: `Server returned HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as TatumMarketResponse;
    return {
      ...data,
      configured: data.configured !== false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      configured: true,
      provider: "tatum",
      assets: [],
      error: `Network error: ${msg}`,
    };
  }
}

export async function getCandles(symbol: CoinSymbol, tf: string = "1D"): Promise<Candle[]> {
  try {
    const res = await fetch(`/api/market/candles?symbol=${symbol}&tf=${encodeURIComponent(tf)}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.candles || [];
  } catch {
    return [];
  }
}

/**
 * Objective 24h verification: calls server route to compare settled Tatum price
 * against target and invalidation thresholds.
 */
export async function verifySignal(
  signal: Signal,
  force = false
): Promise<{ verified: boolean; settledPrice?: number; status?: ResolvedSignal["status"]; pnlPct?: number; message?: string }> {
  try {
    const res = await fetch("/api/signals/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signalId: signal.id, force }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { verified: false, message: data.error || data.message || "Verification failed." };
    }

    return {
      verified: true,
      settledPrice: data.outcome?.settledPrice,
      status: data.outcome?.status,
      pnlPct: data.outcome?.pnlPct,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { verified: false, message: msg };
  }
}
