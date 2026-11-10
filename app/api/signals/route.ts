import { NextResponse } from "next/server";
import { getStoredSignals, saveSignal } from "@/lib/server/storage";
import { fetchTatumRateResult, isTatumConfigured } from "@/lib/server/tatum";
import { rememberSignalMemory } from "@/lib/server/walrus";
import { auth } from "@/lib/auth";
import type { CoinSymbol, Direction, Signal } from "@/lib/types";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const signals = await getStoredSignals(userId);

  return NextResponse.json({
    configured: isTatumConfigured(),
    authenticated: Boolean(userId),
    signals,
    count: signals.length,
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to generate and track trading signals." },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = await req.json();
    const { asset, direction, target, invalidation, confidence, rationale } = body as {
      asset: CoinSymbol;
      direction: Direction;
      target?: number;
      invalidation?: number;
      confidence?: number;
      rationale?: string;
    };

    if (!asset || !direction) {
      return NextResponse.json({ error: "Missing required fields: asset and direction" }, { status: 400 });
    }

    if (!isTatumConfigured()) {
      return NextResponse.json(
        {
          error: "TATUM_API_KEY is not configured. Live entry price cannot be captured without Tatum. Please configure TATUM_API_KEY in .env.",
        },
        { status: 400 }
      );
    }

    // Capture real-time entry price from Tatum
    const rateResult = await fetchTatumRateResult(asset);
    if (!rateResult.ok) {
      return NextResponse.json(
        { error: `No live entry price for ${asset}: ${rateResult.reason}` },
        { status: 502 }
      );
    }
    const rate = rateResult;

    const entryPrice = rate.price;
    const now = new Date();
    const verifyAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // Default target and invalidation if not provided
    const isLong = direction === "LONG";
    const finalTarget = target ?? (isLong ? +(entryPrice * 1.05).toFixed(2) : +(entryPrice * 0.95).toFixed(2));
    const finalInvalidation = invalidation ?? (isLong ? +(entryPrice * 0.97).toFixed(2) : +(entryPrice * 1.03).toFixed(2));

    // Ingest signal creation memory into Walrus Memory
    const fact = `Signal created: ${asset} ${direction} at entry $${entryPrice}, target $${finalTarget}, invalidation $${finalInvalidation}. Rationale: ${rationale || "Technical breakout"}.`;
    const memwalRes = await rememberSignalMemory(fact);

    const signal: Signal = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      asset,
      pair: `${asset}/USD`,
      direction,
      entry: entryPrice,
      target: finalTarget,
      invalidation: finalInvalidation,
      horizon: "24h",
      confidence: confidence ?? 80,
      status: "IN_PROGRESS",
      createdAt: now.toISOString(),
      verifyAt,
      rationale: rationale || `Live call anchored at $${entryPrice.toLocaleString()} via Tatum API.`,
      memoryAudit: {
        summary: memwalRes.success
          ? "Encrypted & ingested into Walrus Memory"
          : "Local memory recorded (Walrus Memory not configured)",
        memoryIds: memwalRes.success ? ["walrus-memory"] : [],
      },
      source: "live",
    };

    const saved = await saveSignal(signal, userId);
    return NextResponse.json({ success: true, signal: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
