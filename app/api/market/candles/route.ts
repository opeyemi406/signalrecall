import { NextResponse } from "next/server";
import type { Candle, CoinSymbol } from "@/lib/types";

const KUCOIN_MAP: Record<string, string> = {
  "1H": "1hour",
  "4H": "4hour",
  "1D": "1day",
  "1W": "1week",
};

const BINANCE_MAP: Record<string, string> = {
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
};

const GATE_MAP: Record<string, string> = {
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "7d",
};

async function fetchFromKucoin(symbol: CoinSymbol, tf: string): Promise<Candle[] | null> {
  try {
    const type = KUCOIN_MAP[tf] || "1day";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}-USDT&type=${type}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "SignalRecall/2.0" },
        next: { revalidate: 15 },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = (await res.json()) as { code: string; data?: Array<[string, string, string, string, string, string, string]> };
    if (json.code !== "200000" || !Array.isArray(json.data) || json.data.length === 0) {
      return null;
    }

    // KuCoin returns newest first. Take up to 50 bars.
    const raw = json.data.slice(0, 50);
    const isIntraday = tf === "1H" || tf === "4H";

    const candles: Candle[] = raw.map((k) => {
      const timeSec = parseInt(k[0], 10);
      const timeVal = isIntraday
        ? timeSec
        : new Date(timeSec * 1000).toISOString().split("T")[0];
      return {
        time: timeVal,
        open: parseFloat(k[1]),
        close: parseFloat(k[2]),
        high: parseFloat(k[3]),
        low: parseFloat(k[4]),
      };
    });

    // Lightweight charts requires ascending order by time
    candles.sort((a, b) => {
      if (typeof a.time === "number" && typeof b.time === "number") return a.time - b.time;
      return String(a.time).localeCompare(String(b.time));
    });

    return candles;
  } catch {
    return null;
  }
}

async function fetchFromBinance(symbol: CoinSymbol, tf: string): Promise<Candle[] | null> {
  try {
    const interval = BINANCE_MAP[tf] || "1d";
    const headers: Record<string, string> = { "User-Agent": "SignalRecall/2.0" };
    if (process.env.BINANCE_API_KEY) {
      headers["X-MBX-APIKEY"] = process.env.BINANCE_API_KEY;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=40`,
      {
        headers,
        signal: controller.signal,
        next: { revalidate: 15 },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;

    const raw = (await res.json()) as Array<[number, string, string, string, string]>;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const isIntraday = tf === "1H" || tf === "4H";
    const candles: Candle[] = raw.map((k) => {
      const timeVal = isIntraday
        ? Math.floor(k[0] / 1000)
        : new Date(k[0]).toISOString().split("T")[0];
      return {
        time: timeVal,
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
      };
    });

    return candles;
  } catch {
    return null;
  }
}

async function fetchFromGate(symbol: CoinSymbol, tf: string): Promise<Candle[] | null> {
  try {
    const interval = GATE_MAP[tf] || "1d";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol}_USDT&interval=${interval}&limit=40`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "SignalRecall/2.0" },
        next: { revalidate: 15 },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const raw = (await res.json()) as Array<[string, string, string, string, string, string, string, string]>;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const isIntraday = tf === "1H" || tf === "4H";
    // Gate.io returns: [timestamp, quote_volume, close, high, low, open, base_volume, window_closed]
    const candles: Candle[] = raw.map((k) => {
      const timeSec = parseInt(k[0], 10);
      const timeVal = isIntraday
        ? timeSec
        : new Date(timeSec * 1000).toISOString().split("T")[0];
      return {
        time: timeVal,
        open: parseFloat(k[5]),
        high: parseFloat(k[3]),
        low: parseFloat(k[4]),
        close: parseFloat(k[2]),
      };
    });

    candles.sort((a, b) => {
      if (typeof a.time === "number" && typeof b.time === "number") return a.time - b.time;
      return String(a.time).localeCompare(String(b.time));
    });

    return candles;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "BTC").toUpperCase() as CoinSymbol;
  const tf = searchParams.get("tf") || "1D";

  try {
    // Multi-tiered exchange fallback:
    // 1. KuCoin (reliable globally, zero cloud datacenter 451 geo-restrictions)
    // 2. Binance (primary standard when non-cloud or supported IP)
    // 3. Gate.io (resilient fallback)
    let candles = await fetchFromKucoin(symbol, tf);
    let provider = "kucoin";

    if (!candles || candles.length === 0) {
      candles = await fetchFromBinance(symbol, tf);
      provider = "binance";
    }

    if (!candles || candles.length === 0) {
      candles = await fetchFromGate(symbol, tf);
      provider = "gate";
    }

    if (!candles || candles.length === 0) {
      return NextResponse.json({
        configured: true,
        candles: [],
        error: "Candle provider data temporarily unavailable",
      });
    }

    return NextResponse.json({
      configured: true,
      provider,
      symbol,
      timeframe: tf,
      candles,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      configured: false,
      candles: [],
      error: `Failed to fetch live candles: ${msg}`,
    });
  }
}
