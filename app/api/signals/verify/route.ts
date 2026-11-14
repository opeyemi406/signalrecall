import { NextResponse } from "next/server";
import { getStoredSignals, saveMemory, updateSignal } from "@/lib/server/storage";
import { isTatumConfigured, verifySignalWithTatum } from "@/lib/server/tatum";
import { rememberSignalMemory } from "@/lib/server/walrus";
import { auth } from "@/lib/auth";
import type { Memory, Signal } from "@/lib/types";

async function generatePostMortem(
  signal: Signal,
  outcome: {
    settledPrice: number | null;
    status: string;
    pnlPct: number | null;
    suiCheckpoint?: number;
  }
): Promise<string> {
  const settledStr = outcome.settledPrice != null ? `$${outcome.settledPrice.toLocaleString()}` : "N/A";
  const pnlStr = outcome.pnlPct != null ? `${outcome.pnlPct > 0 ? "+" : ""}${outcome.pnlPct}%` : "0%";
  const fallbackSummary = `${signal.asset} ${signal.direction} settled at ${settledStr} (${outcome.status.replace("_", " ")}, ${pnlStr} PnL) vs entry $${signal.entry.toLocaleString()}, target $${signal.target.toLocaleString()}, stop $${signal.invalidation.toLocaleString()}.`;

  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openrouterKey) return fallbackSummary;

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
        max_tokens: 240,
        messages: [
          {
            role: "system",
            content:
              "You write concise 2-sentence trading signal post-mortems for long-term Walrus Memory storage. Use only the exact verified prices and rationale provided. Identify what worked or failed and one actionable takeaway for future setups.",
          },
          {
            role: "user",
            content: `Signal: ${signal.asset} ${signal.direction}\nEntry: $${signal.entry}\nTarget: $${signal.target}\nStop: $${signal.invalidation}\nSettled Price: ${settledStr}\nOutcome: ${outcome.status} (${pnlStr})\nSui Checkpoint: #${outcome.suiCheckpoint || "N/A"}\nOriginal Rationale: ${signal.rationale}`,
          },
        ],
      }),
    });

    if (!res.ok) return fallbackSummary;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content?.trim();
    return content || fallbackSummary;
  } catch {
    return fallbackSummary;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { signalId, force } = (await req.json()) as { signalId: string; force?: boolean };

    if (!signalId) {
      return NextResponse.json({ error: "Missing signalId" }, { status: 400 });
    }

    if (!isTatumConfigured()) {
      return NextResponse.json(
        { error: "TATUM_API_KEY is not configured. Cannot perform live onchain verification without Tatum." },
        { status: 400 }
      );
    }

    const signals = await getStoredSignals();
    const signal = signals.find((s) => s.id === signalId);

    if (!signal) {
      return NextResponse.json({ error: `Signal ${signalId} not found.` }, { status: 404 });
    }

    // Server-side ownership check: if signal belongs to a user, caller must be owner
    if (signal.userId && (!session?.user?.id || session.user.id !== signal.userId)) {
      return NextResponse.json(
        { error: "You do not have permission to verify or modify this signal." },
        { status: 403 }
      );
    }

    const now = Date.now();
    const verifyTime = new Date(signal.verifyAt).getTime();

    // Check if 24 hours have elapsed, or if force testing was requested
    if (!force && now < verifyTime) {
      const remainingHours = Math.round((verifyTime - now) / (60 * 60 * 1000));
      return NextResponse.json(
        {
          verified: false,
          message: `Signal verification window has not elapsed yet. Scheduled in ~${remainingHours} hours. Pass force: true to check current progress.`,
          scheduledAt: signal.verifyAt,
        },
        { status: 400 }
      );
    }

    // Run objective Tatum rate verification
    const outcome = await verifySignalWithTatum(signal);
    const postMortem = await generatePostMortem(signal, outcome);

    const settledStr = outcome.settledPrice != null ? `$${outcome.settledPrice.toLocaleString()}` : "N/A";
    const pnlStr = outcome.pnlPct != null ? `${outcome.pnlPct > 0 ? "+" : ""}${outcome.pnlPct}%` : "0%";
    const ownerId = signal.userId || session?.user?.id;

    // Store automatic post-mortem directly into Walrus Memory
    const digestSuffix = outcome.suiDigest ? ` (${outcome.suiDigest.slice(0, 12)}...)` : "";
    const fact = `[OUTCOME] ${signal.asset} ${signal.direction}: Entry $${signal.entry}, Settled ${settledStr} -> ${outcome.status} (${pnlStr}). Sui Checkpoint #${outcome.suiCheckpoint || "N/A"}${digestSuffix}. Post-mortem: ${postMortem}`;
    const memwalRes = await rememberSignalMemory(fact, ownerId);

    const existingIds = signal.memoryAudit?.memoryIds || [];
    const nextIds =
      memwalRes.success && memwalRes.blobId
        ? Array.from(new Set([...existingIds, memwalRes.blobId]))
        : existingIds;

    const updated = await updateSignal(
      signal.id,
      {
        status: outcome.status,
        settledPrice: outcome.settledPrice ?? undefined,
        pnlPct: outcome.pnlPct ?? undefined,
        verifiedAt: outcome.verifiedAt,
        suiCheckpoint: outcome.suiCheckpoint,
        suiDigest: outcome.suiDigest,
        postMortem,
        rationale: `${signal.rationale} [Verified by Tatum at ${settledStr} -> ${outcome.status} (${pnlStr})]`,
        memoryAudit: {
          summary: memwalRes.success
            ? "Verified & post-mortem stored in Walrus Memory"
            : signal.memoryAudit?.summary || "Verified via Tatum",
          memoryIds: nextIds,
        },
      },
      signal.userId
    );

    // Save automatic post-mortem entry into Memory Vault ledger for settled signals
    if (outcome.status === "TARGET_REACHED" || outcome.status === "INVALIDATED") {
      const memoryEntry: Memory = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: ownerId,
        blobId: memwalRes.blobId || "walrus-memory",
        kind: "outcome",
        asset: signal.asset,
        title: `${signal.asset} ${signal.direction} Post-Mortem (${outcome.status.replace("_", " ")})`,
        body: postMortem,
        outcome: `${pnlStr} PnL · Settled at ${settledStr}${outcome.suiCheckpoint ? ` · Sui #${outcome.suiCheckpoint}` : ""}`,
        storedAt: outcome.verifiedAt,
        source: "memory",
      };
      await saveMemory(memoryEntry, ownerId);
    }

    return NextResponse.json({
      verified: true,
      signal: updated,
      outcome,
      postMortem,
      memwalRemembered: memwalRes.success,
      memwalError: memwalRes.error || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
