import { NextResponse } from "next/server";
import { fetchTatumRateResult, isTatumConfigured } from "@/lib/server/tatum";
import { recallSignalMemories } from "@/lib/server/walrus";
import { analyzeCandleSeries, type TechnicalIndicators } from "@/lib/server/technical";
import type { Candle, CoinSymbol } from "@/lib/types";

const KUCOIN_MAP: Record<string, string> = {
  "1H": "1hour",
  "4H": "4hour",
  "1D": "1day",
  "1W": "1week",
};

async function fetchCandlesForAnalysis(symbol: CoinSymbol, tf: string): Promise<Candle[]> {
  try {
    const type = KUCOIN_MAP[tf] || "1day";
    const res = await fetch(
      `https://api.kucoin.com/api/v1/market/candles?symbol=${symbol}-USDT&type=${type}`,
      {
        headers: { "User-Agent": "SignalRecall/2.0" },
        next: { revalidate: 15 },
      }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { code: string; data?: Array<[string, string, string, string, string, string, string]> };
    if (json.code !== "200000" || !Array.isArray(json.data) || json.data.length === 0) {
      return [];
    }

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

    candles.sort((a, b) => {
      if (typeof a.time === "number" && typeof b.time === "number") return a.time - b.time;
      return String(a.time).localeCompare(String(b.time));
    });

    return candles;
  } catch {
    return [];
  }
}

export interface ChartAnalysisResult {
  symbol: CoinSymbol;
  timeframe: string;
  marketBias: "BULLISH MOMENTUM" | "BEARISH BREAKDOWN" | "RANGE CONSOLIDATION" | "OVERSOLD BOUNCE";
  direction: "LONG" | "SHORT";
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  invalidationPrice: number;
  riskRewardRatio: string;
  technicalSummary: TechnicalIndicators;
  insights: string[];
  walrusMemoryCitation?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const symbol = (body.symbol || "BTC").toUpperCase() as CoinSymbol;
    const timeframe = body.timeframe || "1D";

    // 1. Fetch live candles
    const candles = await fetchCandlesForAnalysis(symbol, timeframe);
    if (!candles || candles.length < 5) {
      return NextResponse.json(
        { error: `Insufficient candlestick data available for ${symbol} on ${timeframe}` },
        { status: 502 }
      );
    }

    // 2. Fetch live Tatum spot price
    let spotPrice = candles[candles.length - 1].close;
    if (isTatumConfigured()) {
      const rateRes = await fetchTatumRateResult(symbol);
      if (rateRes.ok) {
        spotPrice = rateRes.price;
      }
    }

    // 3. Compute quantitative indicators
    const technicals = analyzeCandleSeries(candles);

    // 4. Query Walrus Memory for historical precedents
    const namespace = process.env.MEMWAL_NAMESPACE || "signalrecall";
    const walrusRecall = await recallSignalMemories(`${symbol} setup pattern`, 2);
    const walrusSnippet = walrusRecall.results.length > 0 ? walrusRecall.results[0].text : null;

    // 5. Query OpenRouter / DeepSeek with the calculated indicators
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const openrouterModel = process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash";

    let aiResult: Partial<ChartAnalysisResult> = {};

    if (openrouterKey) {
      const systemPrompt = `You are SignalRecall's Lead AI Technical Quantitative Analyst.
You analyze financial candlestick series using standard technical indicators (RSI, Moving Averages, MACD, Bollinger Bands, and ATR).
Your job is to provide objective, non-hallucinated 24-hour trade setups strictly grounded in mathematical calculations.

You MUST reply with a VALID JSON object (no markdown code blocks, no backticks, just raw JSON) matching this schema:
{
  "marketBias": "BULLISH MOMENTUM" | "BEARISH BREAKDOWN" | "RANGE CONSOLIDATION" | "OVERSOLD BOUNCE",
  "direction": "LONG" | "SHORT",
  "confidence": number between 60 and 92,
  "targetPrice": number (realistic 24h take-profit target),
  "invalidationPrice": number (realistic stop-loss beyond dynamic support or resistance),
  "riskRewardRatio": "1:2.2" (or similar),
  "insights": [
    "concise insight 1 referencing RSI and EMAs",
    "concise insight 2 referencing support/resistance or volume",
    "concise insight 3 on 24-hour verification criteria"
  ]
}`;

      const userPrompt = `Asset: ${symbol} (${timeframe} Timeframe)
Current Live Spot Price (Tatum): $${spotPrice}
Calculated Technical Indicators:
- RSI (14): ${technicals.rsi.value} (${technicals.rsi.interpretation})
- EMA Trend: ${technicals.ema.trend} (EMA 9: $${technicals.ema.ema9}, EMA 20: $${technicals.ema.ema20}, EMA 50: $${technicals.ema.ema50})
- MACD: ${technicals.macd.macd} / Signal: ${technicals.macd.signal} (Signal Cross: ${technicals.macd.signalCross})
- Bollinger Bands: Upper $${technicals.bollingerBands.upper}, Middle $${technicals.bollingerBands.middle}, Lower $${technicals.bollingerBands.lower} (${technicals.bollingerBands.status})
- Nearest Structure Levels: Major Resistance $${technicals.levels.majorResistance}, Major Support $${technicals.levels.majorSupport}
- ATR (14 Volatility): $${technicals.atr}
- Recalled Walrus Memory: ${walrusSnippet || "None on record."}

Produce the structured 24h technical analysis JSON now.`;

      try {
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": process.env.AUTH_URL || "https://signal-recall.up.railway.app",
            "X-Title": "SignalRecall",
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 800,
          }),
        });

        if (orRes.ok) {
          const orJson = await orRes.json();
          const rawText = orJson?.choices?.[0]?.message?.content || "";
          // Clean json
          const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          aiResult = parsed;
        }
      } catch (e) {
        console.warn("[Chart Analysis] DeepSeek call error:", e);
      }
    }

    // Fallback if AI inference fails or offline
    const isBullish = technicals.ema.alignment === "BULLISH" || technicals.rsi.value >= 50;
    const direction = aiResult.direction || (isBullish ? "LONG" : "SHORT");
    const targetPrice =
      aiResult.targetPrice ||
      (direction === "LONG"
        ? +(spotPrice + technicals.atr * 1.5).toFixed(2)
        : +(spotPrice - technicals.atr * 1.5).toFixed(2));
    const invalidationPrice =
      aiResult.invalidationPrice ||
      (direction === "LONG"
        ? +(spotPrice - technicals.atr * 0.8).toFixed(2)
        : +(spotPrice + technicals.atr * 0.8).toFixed(2));

    const marketBias =
      aiResult.marketBias ||
      (isBullish
        ? technicals.rsi.value > 60
          ? "BULLISH MOMENTUM"
          : "RANGE CONSOLIDATION"
        : technicals.rsi.value < 35
        ? "OVERSOLD BOUNCE"
        : "BEARISH BREAKDOWN");

    const insights = aiResult.insights && aiResult.insights.length > 0
      ? aiResult.insights
      : [
          `RSI at ${technicals.rsi.value} indicates ${technicals.rsi.interpretation.toLowerCase()}.`,
          `Price trading relative to 20 EMA ($${technicals.ema.ema20.toLocaleString()}) with ${technicals.macd.signalCross.replace("_", " ").toLowerCase()}.`,
          `Immediate structural support sits at $${technicals.levels.majorSupport.toLocaleString()} with resistance at $${technicals.levels.majorResistance.toLocaleString()}.`,
        ];

    const result: ChartAnalysisResult = {
      symbol,
      timeframe,
      marketBias,
      direction,
      confidence: aiResult.confidence || (isBullish ? 76 : 72),
      entryPrice: spotPrice,
      targetPrice,
      invalidationPrice,
      riskRewardRatio: aiResult.riskRewardRatio || "1:2.0",
      technicalSummary: technicals,
      insights,
      walrusMemoryCitation: walrusSnippet,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Chart analysis failed: ${msg}` }, { status: 500 });
  }
}
