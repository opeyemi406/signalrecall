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

export function getUserNamespace(userId?: string): string {
  const base = process.env.MEMWAL_NAMESPACE || "signalrecall";
  return userId ? `${base}:${userId}` : base;
}

export function getMemWalStatus(userId?: string): MemWalStatus {
  const configured = isMemWalConfigured();
  return {
    configured,
    serverUrl: process.env.MEMWAL_SERVER_URL || undefined,
    accountId: process.env.MEMWAL_ACCOUNT_ID || undefined,
    namespace: configured ? getUserNamespace(userId) : undefined,
  };
}

const memwalClients = new Map<string, ReturnType<typeof MemWal.create>>();

export function getMemWalClient(userId?: string) {
  const namespace = getUserNamespace(userId);
  const existing = memwalClients.get(namespace);
  if (existing) return existing;

  const key = process.env.MEMWAL_DELEGATE_KEY || process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  const serverUrl = process.env.MEMWAL_SERVER_URL;

  if (!key || !accountId || !serverUrl) {
    throw new Error(
      "Walrus Memory is not configured. Please supply MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, and MEMWAL_DELEGATE_KEY in .env"
    );
  }

  const client = MemWal.create({
    key,
    accountId,
    serverUrl,
    namespace,
  });

  memwalClients.set(namespace, client);
  return client;
}

/**
 * Remember an observation, pattern, or verification receipt using Walrus Memory
 * Scoped to the signed-in user's Walrus namespace when userId is provided.
 */
export async function rememberSignalMemory(
  text: string,
  userId?: string
): Promise<{ success: boolean; memoryText: string; namespace: string; error?: string }> {
  const namespace = getUserNamespace(userId);
  if (!isMemWalConfigured()) {
    return {
      success: false,
      memoryText: text,
      namespace,
      error: "Walrus Memory unconfigured: missing MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, or MEMWAL_DELEGATE_KEY",
    };
  }

  try {
    const client = getMemWalClient(userId);
    await client.rememberAndWait(text, namespace, { timeoutMs: 30_000 });
    return { success: true, memoryText: text, namespace };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, memoryText: text, namespace, error: msg };
  }
}

/**
 * Semantic vector search over stored memories using Walrus Memory
 * Scoped to the signed-in user's Walrus namespace when userId is provided.
 */
export async function recallSignalMemories(
  query: string,
  topK = 5,
  _maxDistance = 0.8,
  userId?: string
): Promise<{ success: boolean; namespace: string; results: Array<{ text: string; distance?: number }>; error?: string }> {
  const namespace = getUserNamespace(userId);
  if (!isMemWalConfigured()) {
    return {
      success: false,
      namespace,
      results: [],
      error: "Walrus Memory unconfigured: missing MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, or MEMWAL_DELEGATE_KEY",
    };
  }

  try {
    const client = getMemWalClient(userId);
    const result: RecallResult = await client.recall({
      query,
      limit: topK,
      namespace,
    });
    return {
      success: true,
      namespace,
      results: result.results.map((r) => ({
        text: r.text,
        distance: r.distance,
      })),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, namespace, results: [], error: msg };
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
