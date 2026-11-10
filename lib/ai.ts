import type { ChatMessage } from "@/lib/types";

/**
 * Assistant client: sends user prompt to server-side AI endpoint,
 * which grounds responses using live Tatum market prices and decentralized Walrus memories.
 */
export async function askAssistant(prompt: string): Promise<ChatMessage> {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `Error communicating with AI service: ${err.error || res.statusText}`,
      };
    }

    const data = await res.json();
    return data.reply;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      id: `err-${Date.now()}`,
      role: "assistant",
      content: `Network error connecting to assistant: ${msg}`,
    };
  }
}
