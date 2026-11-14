"use client";

import * as React from "react";
import {
  Plus,
  RefreshCw,
  KeyRound,
  Search,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { SearchContext } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { shortDate } from "@/lib/time";
import { SUPPORTED_COINS, type CoinSymbol, type Memory, type MemoryKind } from "@/lib/types";

interface WalrusStatus {
  configured: boolean;
  serverUrl?: string;
  accountId?: string;
  namespace?: string;
}

export default function MemoryBankPage() {
  const { query: globalQuery } = React.useContext(SearchContext);
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [status, setStatus] = React.useState<WalrusStatus>({ configured: true });
  const [modalOpen, setModalOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [selectedAsset, setSelectedAsset] = React.useState<CoinSymbol>("BTC");
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [recallQuery, setRecallQuery] = React.useState("");
  const [recalling, setRecalling] = React.useState(false);
  const [recallResults, setRecallResults] = React.useState<Array<{ text: string; distance?: number }> | null>(null);
  const [recallError, setRecallError] = React.useState<string | null>(null);

  const loadMemories = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/walrus");
      const data = await res.json();
      setMemories(data.memories || []);
      if (data.status) {
        setStatus(data.status);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleSemanticRecall = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = recallQuery.trim();
    if (!q) {
      setRecallResults(null);
      setRecallError(null);
      return;
    }
    setRecalling(true);
    setRecallError(null);
    try {
      const res = await fetch(`/api/walrus?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setRecallError(data.error || "Semantic recall failed.");
        setRecallResults([]);
      } else {
        setRecallResults(Array.isArray(data.results) ? data.results : []);
      }
    } catch (err: unknown) {
      setRecallError(err instanceof Error ? err.message : "Semantic recall failed.");
      setRecallResults([]);
    } finally {
      setRecalling(false);
    }
  };

  const q = globalQuery.trim().toLowerCase();
  const visibleMemories = q
    ? memories.filter((m) =>
        `${m.title} ${m.body} ${m.asset || ""} ${m.kind} ${m.outcome || ""}`
          .toLowerCase()
          .includes(q)
      )
    : memories;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/walrus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "pattern" as MemoryKind,
          asset: selectedAsset,
          title: title.trim(),
          body: body.trim(),
          outcome: outcome.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to commit memory to Walrus Memory relayer.");
      } else {
        setMemories((prev) => [data.memory, ...prev]);
        setTitle("");
        setBody("");
        setOutcome("");
        setModalOpen(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[28px] font-semibold tracking-tight text-white">
              Walrus Memory Bank
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border shrink-0 ${
                status.configured
                  ? "border-[#19D49A]/30 bg-[#19D49A]/10 text-[#19D49A]"
                  : "border-[#F5A623]/30 bg-[#F5A623]/10 text-[#F5A623]"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  status.configured ? "bg-[#19D49A]" : "bg-[#F5A623]"
                }`}
              />
              {status.configured ? "Relayer Live" : "Awaiting Credentials"}
            </span>
          </div>
          <p className="text-[15px] text-fg-2 mt-1">
            Verifiable, encrypted AI agent context persistence powered by official Walrus Memory SDK (@mysten-incubation/memwal)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={loadMemories}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Vault</span>
          </Button>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="size-3.5" />
                <span>Store Memory</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="border border-white/10 bg-[#0B1024]/95 backdrop-blur-2xl text-white">
              <DialogTitle className="text-lg font-semibold text-white">
                Store Encrypted Walrus Memory
              </DialogTitle>
              <DialogDescription className="text-xs text-fg-2">
                This observation is vectorized, encrypted, and anchored permanently onto Walrus via your MemWal relayer.
              </DialogDescription>

              {errorMsg && (
                <div className="rounded-xl border border-[#FF4D5E]/30 bg-[#FF4D5E]/10 p-3 text-xs text-[#FF4D5E]">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Related Asset</label>
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value as CoinSymbol)}
                    className="glass-pill h-10 w-full rounded-full px-4 text-xs text-white bg-black/40 border border-white/10 outline-none"
                  >
                    {SUPPORTED_COINS.map((sym) => (
                      <option key={sym} value={sym} className="bg-[#0B1024] text-white">
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Memory Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BTC Range Breakout & 48h Retest"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Observation &amp; Pattern</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    placeholder="Describe market condition, liquidity grab, or catalyst..."
                    required
                    className="w-full rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-xs text-white placeholder:text-fg-3 outline-none focus:border-electric/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Observed Outcome (Optional)</label>
                  <Input
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="e.g. +7.4% surge over subsequent 36 hours"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={saving}
                  >
                    {saving ? "Ingesting..." : "Remember to Walrus"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!loading && !status.configured && (
        <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/10 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-[#F5A623]">
            <KeyRound className="size-5" />
            <h3 className="text-sm font-semibold">Walrus Memory Relayer Unconfigured</h3>
          </div>
          <p className="text-xs text-fg-2 leading-relaxed max-w-2xl">
            SignalRecall uses zero mock data. To enable live encrypted memory persistence, provide your Walrus Memory Relayer credentials in your server environment:
          </p>
          <div className="bg-black/40 rounded-xl p-3 text-xs font-mono text-fg-2 border border-white/5 space-y-1">
            <div className="text-white"># Add to .env:</div>
            <div>MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz</div>
            <div>MEMWAL_ACCOUNT_ID=0x...</div>
            <div>MEMWAL_DELEGATE_KEY=0x...</div>
            <div>MEMWAL_NAMESPACE=signalrecall</div>
          </div>
        </div>
      )}

      {/* Main Glass Memory Ledger */}
      <GlassCard variant="tint" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-medium text-white">
            Memory Vault ({visibleMemories.length} Entries)
          </h3>
          <span className="text-xs text-fg-3 font-mono">
            {status.configured ? `Namespace: ${status.namespace || "signalrecall"}` : "Awaiting Relayer"}
          </span>
        </div>

        {/* Semantic Vector Recall Query Bar */}
        <form onSubmit={handleSemanticRecall} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              value={recallQuery}
              onChange={(e) => setRecallQuery(e.target.value)}
              placeholder="Semantic vector recall (e.g. BTC breakout, SOL support, CPI reaction)..."
              aria-label="Semantic vector recall query"
              className="glass-pill h-10 w-full rounded-full pl-4 pr-10 text-xs text-white placeholder:text-fg-3 outline-none focus:border-electric/60"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-2" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="submit" variant="glass" size="sm" disabled={recalling || !recallQuery.trim()}>
              <Sparkles className="size-3.5 text-electric" />
              <span>{recalling ? "Recalling..." : "Vector Recall"}</span>
            </Button>
            {recallResults !== null && (
              <Button
                type="button"
                variant="glass"
                size="sm"
                onClick={() => {
                  setRecallQuery("");
                  setRecallResults(null);
                  setRecallError(null);
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>

        {recallResults !== null && (
          <div className="rounded-2xl border border-electric/25 bg-electric/5 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-electric">
                Walrus Vector Recall Matches ({recallResults.length})
              </span>
              <span className="text-fg-3 font-mono truncate max-w-full">
                Query: &ldquo;{recallQuery}&rdquo;
              </span>
            </div>
            {recallError ? (
              <div className="text-xs text-[#FF4D5E]">{recallError}</div>
            ) : recallResults.length === 0 ? (
              <div className="text-xs text-fg-2">No matching vector memories found for this query.</div>
            ) : (
              <div className="space-y-2">
                {recallResults.map((r, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-white/90 leading-relaxed flex flex-wrap items-start justify-between gap-2"
                  >
                    <span className="flex-1 min-w-0 break-words">{r.text}</span>
                    {typeof r.distance === "number" && (
                      <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-fg-2">
                        dist {r.distance.toFixed(3)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && visibleMemories.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-3">
            Loading encrypted memories from Walrus...
          </div>
        ) : visibleMemories.length === 0 ? (
          <div className="py-16 text-center text-sm text-fg-3 space-y-2">
            <p className="text-white font-medium text-base">
              {q ? "No memories matching search" : "No memories stored yet"}
            </p>
            <p className="text-fg-2 max-w-md mx-auto leading-relaxed">
              Store patterns, catalyst reactions, and verified trade settlements. The AI recalls these memories to ground future analysis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleMemories.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3 hover:bg-white/[0.05] transition-colors min-w-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-electric uppercase tracking-wider">
                    {m.kind} {m.asset ? `· ${m.asset}` : ""}
                  </span>
                  <span className="text-xs text-fg-3 font-mono">
                    {shortDate(m.storedAt)}
                  </span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-white break-words">{m.title}</h4>
                  <p className="text-sm text-fg-2 mt-1 leading-relaxed break-words">{m.body}</p>
                </div>

                {m.outcome && (
                  <div className="text-xs bg-[#19D49A]/10 border border-[#19D49A]/20 text-[#19D49A] p-2 rounded-xl font-medium">
                    Outcome: {m.outcome}
                  </div>
                )}

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-fg-3 font-mono truncate max-w-[200px]">
                    Vault: Walrus Memory
                  </span>
                  <span className="text-fg-2">Stored</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
