import { NextResponse } from "next/server";
import type { Candle, CoinSymbol } from "@/lib/types";

const INTERVAL_MAP: Record<string, string> = {
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "BTC").toUpperCase() as CoinSymbol;
  const tf = searchParams.get("tf") || "1D";
  const interval = INTERVAL_MAP[tf] || "1d";

  try {
    const headers: Record<string, string> = {};
    if (process.env.BINANCE_API_KEY) {
      headers["X-MBX-APIKEY"] = process.env.BINANCE_API_KEY;
    }

    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=40`,
      {
        headers,
        next: { revalidate: 15 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        candles: [],
        error: `Candle provider returned ${res.status}`,
      });
    }

    const raw = (await res.json()) as Array<[number, string, string, string, string]>;
    const isIntraday = tf === "1H" || tf === "4H";
    const candles: Candle[] = raw.map((k) => {
      // Intraday uses unix timestamp in seconds for precise hourly bars; daily uses YYYY-MM-DD
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

    return NextResponse.json({
      configured: true,
      provider: "live-exchange",
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
