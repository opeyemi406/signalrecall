import { NextResponse } from "next/server";
import { getStoredSignals, updateSignal } from "@/lib/server/storage";
import { isTatumConfigured, verifySignalWithTatum } from "@/lib/server/tatum";
import { rememberSignalMemory } from "@/lib/server/walrus";
import { auth } from "@/lib/auth";

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

    // Update the signal in persistent storage
    const settledStr = outcome.settledPrice != null ? `$${outcome.settledPrice.toLocaleString()}` : "N/A";
    const pnlStr = outcome.pnlPct != null ? `${outcome.pnlPct > 0 ? "+" : ""}${outcome.pnlPct}%` : "0%";
    const updated = await updateSignal(
      signal.id,
      {
        status: outcome.status,
        rationale: `${signal.rationale} [Verified by Tatum at ${settledStr} -> ${outcome.status} (${pnlStr})]`,
      },
      signal.userId
    );

    // Ingest the verified trade learning into Walrus Memory
    const fact = `Signal ${signal.asset} ${signal.direction}: Entry $${signal.entry}, Settled $${settledStr} -> Outcome: ${outcome.status} (${pnlStr}). Sui Checkpoint #${outcome.suiCheckpoint || "N/A"}.`;
    const memwalRes = await rememberSignalMemory(fact, signal.userId || session?.user?.id);

    return NextResponse.json({
      verified: true,
      signal: updated,
      outcome,
      memwalRemembered: memwalRes.success,
      memwalError: memwalRes.error || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
