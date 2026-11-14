import { getStoredMemories, getStoredSignals } from "@/lib/server/storage";
import { fetchAllTatumRates, isTatumConfigured } from "@/lib/server/tatum";
import { recallSignalMemories } from "@/lib/server/walrus";
import { SUPPORTED_COINS, type AlertType, type CoinSymbol } from "@/lib/types";

export interface LiveCatalyst {
  id: string;
  kind: "upcoming" | "recent";
  title: string;
  summary: string;
  asset: CoinSymbol;
  type: AlertType;
  source: string;
  url?: string;
  timestamp: string; // ISO
  impactScore: number | null;
  impactNote: string;
  walrusMemoryMatch: string | null;
}

const VALID_ALERT_TYPES: AlertType[] = ["bullish", "whale", "resistance", "volume", "cross"];

function inferAssetFromText(text: string): CoinSymbol {
  const upper = text.toUpperCase();
  if (upper.includes("ETH") || upper.includes("ETHEREUM")) return "ETH";
  if (upper.includes("SOL") || upper.includes("SOLANA")) return "SOL";
  if (upper.includes("SUI")) return "SUI";
  if (upper.includes("BNB") || upper.includes("BINANCE")) return "BNB";
  if (upper.includes("XRP") || upper.includes("RIPPLE")) return "XRP";
  return "BTC";
}

function normalizeAlertType(raw?: string): AlertType {
  if (raw && VALID_ALERT_TYPES.includes(raw as AlertType)) {
    return raw as AlertType;
  }
  return "bullish";
}

async function gatherMarketAndMemoryContext(query: string, userId?: string) {
  const [walrusRecall, memories, signals, market] = await Promise.all([
    recallSignalMemories(query, 5, 0.8, userId),
    getStoredMemories(userId),
    getStoredSignals(userId),
    isTatumConfigured()
      ? fetchAllTatumRates()
      : Promise.resolve({ configured: false, assets: [] }),
  ]);

  const marketSummary =
    market.assets
      ?.filter((a) => !a.unavailableReason && a.price > 0)
      .map(
        (a) =>
          `${a.symbol}: $${a.price} (24h ${a.change24h >= 0 ? "+" : ""}${a.change24h.toFixed(2)}%, Vol $${(a.volume24h / 1e6).toFixed(1)}M)`
      )
      .join(" | ") || "Live market rates unavailable.";

  const memoryLines = [
    ...walrusRecall.results.map((r) => `[MemWal] ${r.text}`),
    ...memories.slice(0, 6).map(
      (m) => `[Vault${m.asset ? ` ${m.asset}` : ""}] ${m.title}: ${m.body}${m.outcome ? ` (Outcome: ${m.outcome})` : ""}`
    ),
  ];

  const signalLines = signals.slice(0, 6).map(
    (s) => `[Signal ${s.asset} ${s.direction}] Entry $${s.entry} -> Target $${s.target}, Status: ${s.status}`
  );

  return {
    marketSummary,
    memoryLines,
    signalLines,
    firstMemoryMatch: walrusRecall.results[0]?.text || null,
  };
}

/**
 * Score a single user-created alert using real Walrus Memory + live Tatum market data via OpenRouter.
 * Never returns a hardcoded fallback score; returns null if OpenRouter is unavailable.
 */
export async function scoreSingleAlertWithMemory(params: {
  title: string;
  asset: CoinSymbol;
  userId?: string;
}): Promise<{
  impactScore: number | null;
  impactNote: string;
  type: AlertType;
  walrusMemoryMatch: string | null;
}> {
  const ctx = await gatherMarketAndMemoryContext(`${params.asset} ${params.title}`, params.userId);
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!openrouterKey) {
    return {
      impactScore: null,
      impactNote: "Historical impact scoring requires OPENROUTER_API_KEY.",
      type: "bullish",
      walrusMemoryMatch: ctx.firstMemoryMatch,
    };
  }

  const openrouterModel = process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash";
  const appUrl = process.env.AUTH_URL || "https://signal-recall.up.railway.app";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
        temperature: 0.2,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content:
              'You score crypto trading alerts based strictly on live market telemetry and recalled Walrus memories. Reply ONLY with valid JSON: {"impactScore": number (0-100), "type": "bullish"|"whale"|"resistance"|"volume"|"cross", "impactNote": "1 concise sentence citing recalled memory or live 24h volatility"}',
          },
          {
            role: "user",
            content: `Alert: "${params.title}" on ${params.asset}\nLive Market: ${ctx.marketSummary}\nWalrus Memories (${ctx.memoryLines.length}): ${ctx.memoryLines.join(" ; ") || "None stored yet."}\nUser Signals (${ctx.signalLines.length}): ${ctx.signalLines.join(" ; ") || "None recorded."}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return {
        impactScore: null,
        impactNote: `AI impact scoring unavailable (HTTP ${res.status}).`,
        type: "bullish",
        walrusMemoryMatch: ctx.firstMemoryMatch,
      };
    }

    const json = await res.json();
    const raw = (json?.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        impactScore: null,
        impactNote: "AI returned an unparseable impact score.",
        type: "bullish",
        walrusMemoryMatch: ctx.firstMemoryMatch,
      };
    }

    const parsed = JSON.parse(match[0]) as {
      impactScore?: number;
      impactNote?: string;
      type?: string;
    };

    const score =
      typeof parsed.impactScore === "number" && !Number.isNaN(parsed.impactScore)
        ? Math.max(0, Math.min(100, Math.round(parsed.impactScore)))
        : null;

    return {
      impactScore: score,
      impactNote:
        typeof parsed.impactNote === "string" && parsed.impactNote.trim()
          ? parsed.impactNote.trim()
          : "Scored against live market data and Walrus Memory.",
      type: normalizeAlertType(parsed.type),
      walrusMemoryMatch: ctx.firstMemoryMatch,
    };
  } catch {
    return {
      impactScore: null,
      impactNote: "AI impact scoring request failed.",
      type: "bullish",
      walrusMemoryMatch: ctx.firstMemoryMatch,
    };
  }
}

/**
 * Fetch real upcoming macro calendar events (if permitted by Finnhub key) + live crypto/macro news catalysts,
 * then batch-score them against live Tatum market data and the user's Walrus memories.
 */
export async function fetchAndScoreCatalysts(userId?: string): Promise<{
  configured: boolean;
  catalysts: LiveCatalyst[];
  error?: string;
}> {
  const finnhubKey = process.env.FINNHUB_API_KEY?.trim();
  if (!finnhubKey) {
    return {
      configured: false,
      catalysts: [],
      error: "FINNHUB_API_KEY is not configured in the server environment.",
    };
  }

  const now = new Date();
  const fromDate = now.toISOString().split("T")[0];
  const toDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [cryptoNewsRes, macroNewsRes, calendarRes] = await Promise.all([
    fetch(`https://finnhub.io/api/v1/news?category=crypto&token=${finnhubKey}`, {
      next: { revalidate: 180 },
    }).catch(() => null),
    fetch(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`, {
      next: { revalidate: 180 },
    }).catch(() => null),
    fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${fromDate}&to=${toDate}&token=${finnhubKey}`,
      { next: { revalidate: 300 } }
    ).catch(() => null),
  ]);

  const rawCatalysts: Array<{
    id: string;
    kind: "upcoming" | "recent";
    title: string;
    summary: string;
    asset: CoinSymbol;
    source: string;
    url?: string;
    timestamp: string;
  }> = [];

  // 1. Real upcoming macro economic calendar events (if Finnhub plan allows endpoint)
  if (calendarRes && calendarRes.ok) {
    try {
      const calJson = (await calendarRes.json()) as {
        economicCalendar?: Array<{
          country?: string;
          event?: string;
          impact?: string;
          time?: string;
          estimate?: number | string;
          prev?: number | string;
          unit?: string;
        }>;
      };
      const upcoming = (calJson.economicCalendar || [])
        .filter((e) => e.event && (e.impact === "high" || e.impact === "medium") && e.country === "US")
        .slice(0, 4);

      for (const ev of upcoming) {
        const isoTime = ev.time ? new Date(ev.time.replace(" ", "T") + "Z").toISOString() : now.toISOString();
        rawCatalysts.push({
          id: `cal-${ev.event}-${isoTime}`.replace(/\s+/g, "-").slice(0, 48),
          kind: "upcoming",
          title: `${ev.country} ${ev.event}`,
          summary: `Scheduled macro release (${ev.impact || "macro"} impact).${ev.estimate != null ? ` Est: ${ev.estimate}${ev.unit || ""}` : ""}${ev.prev != null ? ` · Prev: ${ev.prev}${ev.unit || ""}` : ""}`,
          asset: "BTC",
          source: "Finnhub Economic Calendar",
          timestamp: isoTime,
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  // 2. Real recent crypto catalysts from Finnhub
  if (cryptoNewsRes && cryptoNewsRes.ok) {
    try {
      const items = (await cryptoNewsRes.json()) as Array<{
        id: number;
        datetime: number;
        headline: string;
        summary: string;
        source: string;
        url: string;
      }>;
      for (const item of items.slice(0, 6)) {
        rawCatalysts.push({
          id: `news-${item.id}`,
          kind: "recent",
          title: item.headline,
          summary: item.summary || item.headline,
          asset: inferAssetFromText(`${item.headline} ${item.summary || ""}`),
          source: item.source || "Finnhub Crypto",
          url: item.url,
          timestamp: new Date(item.datetime * 1000).toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  // 3. Macro headlines (Fed, CPI, Treasury, ETF) from general wire if needed
  if (macroNewsRes && macroNewsRes.ok && rawCatalysts.length < 6) {
    try {
      const items = (await macroNewsRes.json()) as Array<{
        id: number;
        datetime: number;
        headline: string;
        summary: string;
        source: string;
        url: string;
      }>;
      const macroFiltered = items
        .filter((item) =>
          /\b(fed|fomc|cpi|inflation|rate|sec|etf|treasury|bitcoin|crypto|tariff)\b/i.test(
            `${item.headline} ${item.summary || ""}`
          )
        )
        .slice(0, 3);

      for (const item of macroFiltered) {
        rawCatalysts.push({
          id: `macro-${item.id}`,
          kind: "recent",
          title: item.headline,
          summary: item.summary || item.headline,
          asset: inferAssetFromText(`${item.headline} ${item.summary || ""}`),
          source: item.source || "Finnhub Macro",
          url: item.url,
          timestamp: new Date(item.datetime * 1000).toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  const topCatalysts = rawCatalysts.slice(0, 6);
  if (topCatalysts.length === 0) {
    return {
      configured: true,
      catalysts: [],
      error: "No live catalysts returned from Finnhub at this moment.",
    };
  }

  const combinedQuery = topCatalysts.map((c) => c.title).join(" ").slice(0, 240);
  const ctx = await gatherMarketAndMemoryContext(combinedQuery, userId);

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openrouterModel = process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash";
  const appUrl = process.env.AUTH_URL || "https://signal-recall.up.railway.app";

  const scoredById: Record<
    string,
    { impactScore: number | null; impactNote: string; type: AlertType; asset?: CoinSymbol }
  > = {};

  if (openrouterKey) {
    try {
      const promptItems = topCatalysts.map((c) => ({
        id: c.id,
        kind: c.kind,
        asset: c.asset,
        title: c.title,
        summary: c.summary.slice(0, 180),
      }));

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
          temperature: 0.2,
          max_tokens: 4096,
          messages: [
            {
              role: "system",
              content:
                'You are SignalRecall\'s catalyst impact analyst. Score each live catalyst strictly using the provided market telemetry and recalled Walrus memories. Reply ONLY with a valid JSON array matching: [{"id": string, "asset": "BTC"|"ETH"|"SOL"|"SUI"|"BNB"|"XRP", "type": "bullish"|"whale"|"resistance"|"volume"|"cross", "impactScore": number (0-100), "impactNote": "1 concise sentence explaining historical/market impact"}]',
            },
            {
              role: "user",
              content: `Live Market: ${ctx.marketSummary}\nWalrus Memories (${ctx.memoryLines.length}): ${ctx.memoryLines.join(" ; ") || "None stored yet."}\nUser Signals (${ctx.signalLines.length}): ${ctx.signalLines.join(" ; ") || "None recorded."}\nCatalysts:\n${JSON.stringify(promptItems)}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("[catalysts] OpenRouter non-OK response:", res.status, errText.slice(0, 300));
      } else {
        const json = await res.json();
        const raw = (json?.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
        const arrMatch = raw.match(/\[[\s\S]*\]/);
        if (!arrMatch) {
          console.error("[catalysts] OpenRouter response missing JSON array:", raw.slice(0, 300));
        } else {
          const parsed = JSON.parse(arrMatch[0]) as Array<{
            id: string;
            asset?: string;
            type?: string;
            impactScore?: number;
            impactNote?: string;
          }>;
          for (const row of parsed) {
            if (row?.id) {
              const validAsset = SUPPORTED_COINS.includes(row.asset as CoinSymbol)
                ? (row.asset as CoinSymbol)
                : undefined;
              scoredById[row.id] = {
                impactScore:
                  typeof row.impactScore === "number" && !Number.isNaN(row.impactScore)
                    ? Math.max(0, Math.min(100, Math.round(row.impactScore)))
                    : null,
                impactNote:
                  typeof row.impactNote === "string" && row.impactNote.trim()
                    ? row.impactNote.trim()
                    : "Evaluated against live market telemetry.",
                type: normalizeAlertType(row.type),
                asset: validAsset,
              };
            }
          }
        }
      }
    } catch (err) {
      console.error("[catalysts] Scoring failed:", err instanceof Error ? err.message : err);
      // leave scoredById empty -> scores remain null rather than fabricated
    }
  }

  const catalysts: LiveCatalyst[] = topCatalysts.map((c) => {
    const s = scoredById[c.id];
    return {
      id: c.id,
      kind: c.kind,
      title: c.title,
      summary: c.summary,
      asset: s?.asset || c.asset,
      type: s?.type || "bullish",
      source: c.source,
      url: c.url,
      timestamp: c.timestamp,
      impactScore: s ? s.impactScore : null,
      impactNote: s
        ? s.impactNote
        : openrouterKey
        ? "Impact score pending AI evaluation."
        : "Configure OPENROUTER_API_KEY for historical impact scoring.",
      walrusMemoryMatch: ctx.firstMemoryMatch,
    };
  });

  return {
    configured: true,
    catalysts,
  };
}
