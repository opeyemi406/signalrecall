import { NextResponse } from "next/server";
import { getStoredMemories, getStoredSignals } from "@/lib/server/storage";
import { fetchAllTatumRates, isTatumConfigured } from "@/lib/server/tatum";
import { analyzeCandleSeries } from "@/lib/server/technical";
import { recallSignalMemories } from "@/lib/server/walrus";
import { auth } from "@/lib/auth";
import { SUPPORTED_COINS, type Candle, type ChatMessage, type CoinSymbol } from "@/lib/types";

async function fetchLiveCandles(symbol: CoinSymbol): Promise<Candle[]> {
  try {
    const res = await fetch(
      `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}-USDT&type=4hour`,
      {
        headers: { "User-Agent": "SignalRecall/2.0" },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      code: string;
      data?: Array<[string, string, string, string, string, string, string]>;
    };
    if (json.code !== "200000" || !Array.isArray(json.data) || json.data.length === 0) {
      return [];
    }

    const candles: Candle[] = json.data.slice(0, 50).map((k) => ({
      time: parseInt(k[0], 10),
      open: parseFloat(k[1]),
      close: parseFloat(k[2]),
      high: parseFloat(k[3]),
      low: parseFloat(k[4]),
    }));

    candles.sort((a, b) => Number(a.time) - Number(b.time));
    return candles;
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { prompt } = (await req.json()) as { prompt: string };
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!openrouterKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured in .env." },
        { status: 400 }
      );
    }

    const [memories, signals, walrusRecall, market] = await Promise.all([
      getStoredMemories(userId),
      getStoredSignals(userId),
      recallSignalMemories(prompt, 5, 0.8, userId),
      isTatumConfigured()
        ? fetchAllTatumRates()
        : Promise.resolve({ configured: false, assets: [] }),
    ]);

    const p = prompt.toLowerCase();

    // Find relevant user memories from local ledger + Walrus Memory
    const relevant = memories.filter((m) => {
      const hay = `${m.title} ${m.body} ${m.asset || ""} ${m.outcome || ""}`.toLowerCase();
      return p.split(/\W+/).some((w) => w.length > 2 && hay.includes(w));
    });

    // Identify mentioned asset (if any) to compute live 4H technical indicators
    let assetMentioned: CoinSymbol | null = null;
    for (const s of SUPPORTED_COINS) {
      if (
        p.includes(s.toLowerCase()) ||
        (s === "BTC" && p.includes("bitcoin")) ||
        (s === "ETH" && p.includes("ethereum")) ||
        (s === "SOL" && p.includes("solana"))
      ) {
        assetMentioned = s;
        break;
      }
    }

    // Build full live market snapshot from Tatum + Binance 24h deltas
    let rateInfo = "Live market feed unavailable (TATUM_API_KEY not configured).";
    if (market.assets && market.assets.length > 0) {
      const lines = market.assets
        .filter((a) => !a.unavailableReason && a.price > 0)
        .map(
          (a) =>
            `• ${a.symbol} (${a.name}): $${a.price.toLocaleString(undefined, {
              minimumFractionDigits: a.price < 10 ? 4 : 2,
              maximumFractionDigits: a.price < 10 ? 4 : 2,
            })} | 24h Change: ${a.change24h >= 0 ? "+" : ""}${a.change24h.toFixed(
              2
            )}% | 24h Volume: $${(a.volume24h / 1e6).toFixed(1)}M`
        );
      if (lines.length > 0) {
        rateInfo = lines.join("\n");
      }
    }

    // Fetch live 4H candlesticks and compute real technical indicators for mentioned asset (or BTC)
    const targetAssetForTech: CoinSymbol = assetMentioned || "BTC";
    let technicalContext = "";
    const candles = await fetchLiveCandles(targetAssetForTech);
    if (candles.length >= 15) {
      const tech = analyzeCandleSeries(candles);
      technicalContext = `Live 4H Technical Indicators for ${targetAssetForTech} (computed from real OHLCV candles):
• RSI (14): ${tech.rsi.value} (${tech.rsi.interpretation})
• EMA Alignment: ${tech.ema.trend} (EMA 9: $${tech.ema.ema9}, EMA 20: $${tech.ema.ema20}, EMA 50: $${tech.ema.ema50})
• MACD: ${tech.macd.macd} | Signal: ${tech.macd.signal} | Histogram: ${tech.macd.histogram} (${tech.macd.signalCross})
• Bollinger Bands: Upper $${tech.bollingerBands.upper}, Middle $${tech.bollingerBands.middle}, Lower $${tech.bollingerBands.lower} (${tech.bollingerBands.status})
• Structure Levels: Support $${tech.levels.majorSupport}, Resistance $${tech.levels.majorResistance}, Swing Low $${tech.levels.swingLow}, Swing High $${tech.levels.swingHigh}
• ATR (14): $${tech.atr}`;
    }

    // Build real Walrus Memory & Signal Ledger context
    const semanticContext =
      walrusRecall.results.length > 0
        ? walrusRecall.results
            .map((r) => `[Walrus Memory Recall] ${r.text}`)
            .join("\n")
        : "";

    const memContext =
      [
        ...relevant.map(
          (m) =>
            `[Walrus Memory ${m.blobId}] ${m.title}: ${m.body} (Outcome: ${
              m.outcome || "N/A"
            })`
        ),
        semanticContext,
      ]
        .filter(Boolean)
        .join("\n") || "0 matching memories stored in Walrus Memory Vault.";

    const signalContext =
      signals.length > 0
        ? signals
            .slice(0, 5)
            .map(
              (s) =>
                `• ${s.pair} ${s.direction} | Entry: $${s.entry} | Target: $${s.target} | Stop: $${s.invalidation} | Status: ${s.status} | Created: ${s.createdAt}`
            )
            .join("\n")
        : "0 signals recorded in user ledger.";

    const openrouterModel =
      process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash";
    const appUrl =
      process.env.AUTH_URL || "https://signal-recall.up.railway.app";

    const systemPrompt = `You are SignalRecall's AI Trading Intelligence Assistant.
You must answer strictly using the real live data provided below. NEVER invent, guess, or mock any prices, indicators, memories, or signals.

1. LIVE MARKET DATA (Tatum Data API + 24h Exchange Telemetry):
${rateInfo}

2. LIVE TECHNICAL INDICATORS:
${technicalContext || "No candlestick series available."}

3. WALRUS DECENTRALIZED MEMORY VAULT (${memories.length} total stored in user vault):
${memContext}

4. USER SIGNAL LEDGER (${signals.length} total recorded signals):
${signalContext}

Guidelines:
- Use the exact live prices, 24h percentage changes, 24h volumes, and 4H technical indicators (RSI, EMA 9/20/50, MACD, Bollinger Bands, Support/Resistance, ATR) provided above.
- If the Walrus Memory Vault or Signal Ledger has 0 entries for the query, state clearly that 0 memories/signals are stored yet and base your analysis strictly on the live market and technical data above.
- Be concise, well-structured, and direct.`;

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterKey}`,
        "HTTP-Referer": appUrl,
        "X-Title": "SignalRecall",
      },
      body: JSON.stringify({
        model: openrouterModel,
        reasoning: { effort: "low" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      return NextResponse.json(
        { error: `AI model error (${orRes.status}): ${errText}` },
        { status: 502 }
      );
    }

    const orJson = await orRes.json();
    const content = orJson?.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "AI model returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    const reply: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content,
      citations: relevant.slice(0, 3).map((m) => ({ label: m.title, blobId: m.blobId })),
    };

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
