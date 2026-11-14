import { NextResponse } from "next/server";
import {
  deleteStoredAlert,
  getStoredAlerts,
  saveAlert,
  toggleStoredAlert,
} from "@/lib/server/storage";
import { auth } from "@/lib/auth";
import { scoreSingleAlertWithMemory } from "@/lib/server/catalysts";
import type { Alert, AlertType, CoinSymbol } from "@/lib/types";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const alerts = await getStoredAlerts(userId);
  return NextResponse.json({
    authenticated: Boolean(userId),
    alerts,
    count: alerts.length,
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to create custom alerts" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = await req.json();
    const {
      title,
      asset,
      type,
      impactScore,
      impactNote,
      isAISignal,
      url,
      catalystKind,
      scheduledFor,
      walrusMemoryMatch,
    } = body as {
      title: string;
      asset: CoinSymbol;
      type?: AlertType;
      impactScore?: number | null;
      impactNote?: string;
      isAISignal?: boolean;
      url?: string;
      catalystKind?: "upcoming" | "recent" | "custom";
      scheduledFor?: string;
      walrusMemoryMatch?: string | null;
    };

    if (!title || !asset) {
      return NextResponse.json({ error: "Missing required fields: title and asset" }, { status: 400 });
    }

    const scored =
      impactNote !== undefined
        ? {
            impactScore: typeof impactScore === "number" ? impactScore : null,
            impactNote,
            type: type || "bullish",
            walrusMemoryMatch: walrusMemoryMatch ?? null,
          }
        : await scoreSingleAlertWithMemory({ title, asset, userId });

    const alert: Alert = {
      id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      title,
      asset,
      type: type || scored.type,
      createdAt: new Date().toISOString(),
      enabled: true,
      impactScore: scored.impactScore,
      impactNote: scored.impactNote,
      isAISignal: Boolean(isAISignal),
      source: "live",
      url,
      catalystKind: catalystKind || "custom",
      scheduledFor,
      walrusMemoryMatch: scored.walrusMemoryMatch,
    };

    const saved = await saveAlert(alert, userId);
    return NextResponse.json({ success: true, alert: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = (await req.json()) as { id: string };
    const updated = await toggleStoredAlert(id, userId);
    if (!updated) {
      return NextResponse.json(
        { error: "Alert not found or you do not have permission to modify it" },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: true, alert: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = (await req.json()) as { id: string };
    const success = await deleteStoredAlert(id, userId);
    if (!success) {
      return NextResponse.json(
        { error: "Alert not found or you do not have permission to delete it" },
        { status: 403 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
