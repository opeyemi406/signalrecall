/**
 * Walrus Memory client adapter.
 * Interacts with server-side Walrus Memory SDK endpoints.
 */
import type { Memory } from "@/lib/types";

export async function listMemories(): Promise<Memory[]> {
  try {
    const res = await fetch("/api/walrus", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.memories || [];
  } catch {
    return [];
  }
}

export async function recall(query: string, limit = 3): Promise<Array<{ text: string; distance?: number }>> {
  try {
    const res = await fetch(`/api/walrus?query=${encodeURIComponent(query)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, limit);
  } catch {
    return [];
  }
}

export async function remember(
  memory: Omit<Memory, "id" | "blobId" | "storedAt" | "source">
): Promise<{ success: boolean; memory?: Memory; error?: string }> {
  try {
    const res = await fetch("/api/walrus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memory),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Failed to store memory." };
    }

    return {
      success: true,
      memory: data.memory,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
