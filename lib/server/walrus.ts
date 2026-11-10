/**
 * Official Walrus Memory SDK Integration
 *
 * Sources of truth:
 * - https://docs.wal.app/walrus-memory
 * - https://github.com/MystenLabs/memwal
 */

import { MemWal } from "@mysten-incubation/memwal";
import type { RecallResult } from "@mysten-incubation/memwal";

export interface MemWalStatus {
  configured: boolean;
  serverUrl?: string;
  accountId?: string;
  namespace?: string;
}

export function isMemWalConfigured(): boolean {
  const key = process.env.MEMWAL_DELEGATE_KEY || process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  const serverUrl = process.env.MEMWAL_SERVER_URL;
  return Boolean(key && accountId && serverUrl);
}

export function getMemWalStatus(): MemWalStatus {
  const configured = isMemWalConfigured();
  return {
    configured,
    serverUrl: process.env.MEMWAL_SERVER_URL || undefined,
    accountId: process.env.MEMWAL_ACCOUNT_ID || undefined,
    namespace: process.env.MEMWAL_NAMESPACE || undefined,
  };
}

let memwalClientInstance: ReturnType<typeof MemWal.create> | null = null;

export function getMemWalClient() {
  if (memwalClientInstance) return memwalClientInstance;

  const key = process.env.MEMWAL_DELEGATE_KEY || process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  const serverUrl = process.env.MEMWAL_SERVER_URL;
  const namespace = process.env.MEMWAL_NAMESPACE || "signalrecall";

  if (!key || !accountId || !serverUrl) {
    throw new Error(
      "Walrus Memory is not configured. Please supply MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, and MEMWAL_DELEGATE_KEY in .env"
    );
  }

  memwalClientInstance = MemWal.create({
    key,
    accountId,
    serverUrl,
    namespace,
  });

  return memwalClientInstance;
}

/**
 * Remember an observation, pattern, or verification receipt using Walrus Memory
 */
export async function rememberSignalMemory(
  text: string
): Promise<{ success: boolean; memoryText: string; error?: string }> {
  if (!isMemWalConfigured()) {
    return {
      success: false,
      memoryText: text,
      error: "Walrus Memory unconfigured: missing MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, or MEMWAL_DELEGATE_KEY",
    };
  }

  try {
    const client = getMemWalClient();
    await client.rememberAndWait(text, undefined, { timeoutMs: 30_000 });
    return { success: true, memoryText: text };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, memoryText: text, error: msg };
  }
}

/**
 * Semantic vector search over stored memories using Walrus Memory
 */
export async function recallSignalMemories(
  query: string,
  topK = 5,
  maxDistance = 0.8
): Promise<{ success: boolean; results: Array<{ text: string; distance?: number }>; error?: string }> {
  if (!isMemWalConfigured()) {
    return {
      success: false,
      results: [],
      error: "Walrus Memory unconfigured: missing MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, or MEMWAL_DELEGATE_KEY",
    };
  }

  try {
    const client = getMemWalClient();
    const result: RecallResult = await client.recall({ query, topK, maxDistance });
    return {
      success: true,
      results: result.results.map((r) => ({
        text: r.text,
        distance: r.distance,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, results: [], error: msg };
  }
}

/**
 * Health check ping to Walrus Memory relayer
 */
export async function checkMemWalHealth(): Promise<{ ok: boolean; error?: string }> {
  if (!isMemWalConfigured()) {
    return { ok: false, error: "Walrus Memory credentials not set" };
  }

  try {
    const client = getMemWalClient();
    await client.health();
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
