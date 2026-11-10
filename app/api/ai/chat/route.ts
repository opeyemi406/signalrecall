import { NextResponse } from "next/server";
import { getStoredMemories } from "@/lib/server/storage";
import { fetchTatumRate, isTatumConfigured } from "@/lib/server/tatum";
import { recallSignalMemories } from "@/lib/server/walrus";
import { auth } from "@/lib/auth";
import { SUPPORTED_COINS, type ChatMessage, type CoinSymbol } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const { prompt } = (await req.json()) as { prompt: string };
    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const memories = await getStoredMemories(userId);
    const walrusRecall = await recallSignalMemories(prompt, 3);
    const p = prompt.toLowerCase();

    // Find any relevant memories from storage + Walrus Memory
    const relevant = memories.filter((m) => {
      const hay = `${m.title} ${m.body} ${m.asset || ""} ${m.outcome || ""}`.toLowerCase();
      return p.split(/\W+/).some((w) => w.length > 2 && hay.includes(w));
    });

    // Check if user is asking about an asset
    let assetMentioned: CoinSymbol | null = null;
    const symbols: readonly CoinSymbol[] = SUPPORTED_COINS;
    for (const s of symbols) {
      if (p.includes(s.toLowerCase()) || (s === "BTC" && p.includes("bitcoin")) || (s === "ETH" && p.includes("ethereum"))) {
        assetMentioned = s;
        break;
      }
    }

    let rateInfo = "";
    if (assetMentioned && isTatumConfigured()) {
      const rate = await fetchTatumRate(assetMentioned);
      if (rate) {
        rateInfo = `Live ${assetMentioned} spot price via Tatum is $${rate.price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}.`;
      }
    } else if (assetMentioned && !isTatumConfigured()) {
      rateInfo = `Note: TATUM_API_KEY is not configured, so real-time onchain price for ${assetMentioned} is currently unavailable.`;
    }

    let content = "";
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const openrouterModel = process.env.OPENROUTER_MODEL?.trim() || "deepseek/deepseek-v4.1-flash";

    if (openrouterKey) {
      // Call OpenRouter with DeepSeek
      try {
        const semanticContext = walrusRecall.results.length > 0
          ? walrusRecall.results.map((r) => `[Walrus Memory Semantic Search] ${r.text}`).join("\n")
          : "";
        const memContext = [
          ...relevant.map((m) => `[Walrus Memory Blob ${m.blobId}] ${m.title}: ${m.body} (Outcome: ${m.outcome || "N/A"})`),
          semanticContext,
        ].filter(Boolean).join("\n") || "No specific memories found for this query.";

        const systemPrompt = `You are SignalRecall's AI Trading Intelligence Assistant.
You specialize in technical price action, liquidity, and objective 24-hour verification.
You are strictly grounded in:
1. Live Market Data via Tatum Data API (${rateInfo || "Prices streaming live"})
2. Immutable historical observations recalled from decentralized Walrus Memory:
${memContext}

Guidelines:
- Reference specific memories or patterns when relevant.
- Be precise, direct, and concise.
- Never guarantee profits or make wild claims; emphasize 24-hour verification accountability.`;

        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openrouterKey}`,
            "HTTP-Referer": "http://localhost:3001",
            "X-Title": "SignalRecall",
          },
          body: JSON.stringify({
            model: openrouterModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 600,
          }),
        });

        if (orRes.ok) {
          const orJson = await orRes.json();
          content = orJson?.choices?.[0]?.message?.content || "";
        } else {
          const errText = await orRes.text();
          console.warn("[OpenRouter] Error response:", errText);
        }
      } catch (err) {
        console.warn("[OpenRouter] Request failed:", err);
      }
    }

    if (!content) {
      if (relevant.length > 0) {
        const memList = relevant.slice(0, 3).map((m) => `• "${m.title}": ${m.body}`).join("\n");
        content = `Recalled from Walrus Memory:\n${memList}\n\n${rateInfo}\n\nBased on these historical occurrences, monitor 24h follow-through. All calls must be verified through the Tatum 24h verification ledger.`;
      } else if (assetMentioned) {
        content = `${rateInfo}\n\nNo stored historical memories for ${assetMentioned} found in your decentralized Walrus vault yet. Storing observations in the Memory Bank will help ground future analysis.`;
      } else {
        content = `I am SignalRecall's AI analyst. I ground signals and alerts directly against decentralized Walrus memory blobs and Tatum's 24h objective verification engine.\n\n${
          isTatumConfigured() ? "✓ Tatum live feed connected." : "⚠ TATUM_API_KEY unconfigured (add in .env)."
        } Currently indexing ${memories.length} decentralized memories. Ask about BTC, ETH, SOL, SUI, or query your track record.`;
      }
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
