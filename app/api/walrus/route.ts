import { NextResponse } from "next/server";
import { getStoredMemories, saveMemory } from "@/lib/server/storage";
import {
  getMemWalStatus,
  isMemWalConfigured,
  recallSignalMemories,
  rememberSignalMemory,
} from "@/lib/server/walrus";
import { auth } from "@/lib/auth";
import type { CoinSymbol, Memory, MemoryKind } from "@/lib/types";

export async function GET(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (query) {
    if (!isMemWalConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          results: [],
          error: "Walrus Memory credentials not configured in .env",
        },
        { status: 400 }
      );
    }
    const semanticResults = await recallSignalMemories(query);
    return NextResponse.json(semanticResults);
  }

  const memories = await getStoredMemories(userId);
  const status = getMemWalStatus();

  return NextResponse.json({
    count: memories.length,
    authenticated: Boolean(userId),
    status,
    memories,
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to record memories in the Walrus Memory Vault" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const body = await req.json();
    const { kind, asset, title, body: text, outcome } = body as {
      kind: MemoryKind;
      asset?: CoinSymbol;
      title: string;
      body: string;
      outcome?: string;
    };

    if (!title || !text) {
      return NextResponse.json(
        { error: "Missing required fields: title and body" },
        { status: 400 }
      );
    }

    if (!isMemWalConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Walrus Memory unconfigured: supply MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, and MEMWAL_DELEGATE_KEY in .env",
        },
        { status: 400 }
      );
    }

    // Ingest into Walrus Memory SDK (@mysten-incubation/memwal)
    const memoryFact = `[${kind?.toUpperCase() || "PATTERN"}] ${title}${asset ? ` (${asset})` : ""}: ${text}${outcome ? ` Outcome: ${outcome}` : ""}`;
    const memwalRes = await rememberSignalMemory(memoryFact);

    if (!memwalRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: memwalRes.error || "Failed to commit memory to Walrus Memory relayer",
        },
        { status: 502 }
      );
    }

    const memory: Memory = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId,
      blobId: "walrus-memory",
      kind: kind || "pattern",
      asset,
      title,
      body: text,
      outcome,
      storedAt: new Date().toISOString(),
      source: "memory",
    };

    const saved = await saveMemory(memory, userId);

    return NextResponse.json({
      success: true,
      memory: saved,
      memwalRemembered: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
