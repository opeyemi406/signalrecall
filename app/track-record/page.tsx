"use client";

import * as React from "react";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { GlassCard } from "@/components/GlassCard";
import { CoinIcon } from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { computeSignalPnlPct } from "@/lib/utils";
import { shortDate } from "@/lib/time";
import { SearchContext } from "@/components/layout/AppShell";
import type { Memory, Signal } from "@/lib/types";

export default function TrackRecordPage() {
  const { query: globalQuery } = React.useContext(SearchContext);
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sigRes, memRes] = await Promise.all([
        fetch("/api/signals"),
        fetch("/api/walrus"),
      ]);
      const sigData = await sigRes.json();
      const memData = await memRes.json();
      setSignals(sigData.signals || []);
      setMemories(memData.memories || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resolved = signals.filter(
    (s) => s.status === "TARGET_REACHED" || s.status === "INVALIDATED"
  );
  const activeCount = signals.filter((s) => s.status === "IN_PROGRESS").length;
  const wins = resolved.filter((s) => s.status === "TARGET_REACHED").length;
  const losses = resolved.filter((s) => s.status === "INVALIDATED").length;
  const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;

  // Profit Factor = Gross Profit (%) / Gross Loss (%)
  const { grossProfit, grossLoss, profitFactor } = React.useMemo(() => {
    let gp = 0;
    let gl = 0;
    for (const s of resolved) {
      const pnl = computeSignalPnlPct(s);
      if (pnl > 0) gp += pnl;
      else if (pnl < 0) gl += Math.abs(pnl);
    }
    const pf = gl > 0 ? gp / gl : gp > 0 ? gp : 0;
    return { grossProfit: gp, grossLoss: gl, profitFactor: pf };
  }, [resolved]);

  // Memory Efficiency = Win rate of memory-grounded signals (or Walrus-anchored settled ratio)
  const { memoryEfficiency, memoryEfficiencyNote } = React.useMemo(() => {
    const groundedResolved = resolved.filter(
      (s) => s.memoryGrounded || (s.memoryAudit?.memoryIds?.length ?? 0) > 0
    );
    if (groundedResolved.length > 0) {
      const groundedWins = groundedResolved.filter((s) => s.status === "TARGET_REACHED").length;
      const pct = (groundedWins / groundedResolved.length) * 100;
      return {
        memoryEfficiency: pct,
        memoryEfficiencyNote: `${groundedWins}/${groundedResolved.length} Walrus-backed wins`,
      };
    }
    return {
      memoryEfficiency: 0,
      memoryEfficiencyNote: `${memories.length} Walrus memories stored`,
    };
  }, [resolved, memories.length]);

  const netPnl = grossProfit - grossLoss;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Track Record
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            24-hour settlement scorecard, profit factor, and Walrus Memory post-mortems
          </p>
        </div>

        <Button
          variant="glass"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* 4 Real Track Record Scorecard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          label="Win Rate"
          value={winRate}
          suffix="%"
          decimals={1}
          deltaLabel={
            resolved.length > 0
              ? `${wins}W / ${losses}L (${netPnl >= 0 ? "+" : ""}${netPnl.toFixed(2)}% net)`
              : "Awaiting settled calls"
          }
          deltaPositive={winRate >= 50 || resolved.length === 0}
        />

        <StatCard
          label="Total Calls"
          value={signals.length}
          suffix=" Calls"
          deltaLabel={`${resolved.length} settled · ${activeCount} active`}
          deltaPositive={true}
        />

        <StatCard
          label="Profit Factor"
          value={profitFactor}
          decimals={2}
          deltaLabel={
            resolved.length === 0
              ? "Awaiting settled calls"
              : grossLoss === 0 && grossProfit > 0
              ? `Zero realized losses (+${grossProfit.toFixed(2)}%)`
              : `+${grossProfit.toFixed(2)}% / -${grossLoss.toFixed(2)}%`
          }
          deltaPositive={profitFactor >= 1 || resolved.length === 0}
        />

        <StatCard
          label="Memory Efficiency"
          value={memoryEfficiency}
          suffix="%"
          decimals={1}
          deltaLabel={memoryEfficiencyNote}
          deltaPositive={memoryEfficiency >= 50 || resolved.length === 0}
        />
      </div>

      {/* Settled Signal Post-Mortems & Walrus Memory Audit */}
      <GlassCard variant="tint" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-medium text-white">
              Verified Outcomes &amp; Automatic Post-Mortems ({resolved.length})
            </h3>
            <p className="text-xs text-fg-3 mt-0.5">
              Every settled signal is verified against live rates and written into Walrus Memory
            </p>
          </div>
          <span className="text-xs text-fg-3 font-mono">
            {memories.length} Vault Memories
          </span>
        </div>

        {(() => {
          const q = globalQuery.trim().toLowerCase();
          const visibleResolved = q
            ? resolved.filter((sig) =>
                `${sig.asset} ${sig.pair} ${sig.direction} ${sig.status} ${sig.postMortem || ""}`
                  .toLowerCase()
                  .includes(q)
              )
            : resolved;

          if (visibleResolved.length === 0) {
            return (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-2">
            <div className="text-base font-semibold text-white">
              {q ? "No Settled Signals Matching Search" : "No Settled Signals Yet"}
            </div>
            <p className="text-sm text-fg-2 max-w-md mx-auto leading-relaxed">
              Record a 24h signal in the Trading Terminal and run verification to populate Profit Factor, Memory Efficiency, and automatic Walrus post-mortems.
            </p>
          </div>
            );
          }

          return (
          <div className="space-y-3">
            {visibleResolved.map((sig) => {
              const pnl = computeSignalPnlPct(sig);
              const isWin = sig.status === "TARGET_REACHED";

              return (
                <div
                  key={sig.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CoinIcon symbol={sig.asset} size={34} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {sig.pair} {sig.direction}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                              isWin
                                ? "bg-[#19D49A]/15 text-[#19D49A] border-[#19D49A]/30"
                                : "bg-[#FF4D5E]/15 text-[#FF4D5E] border-[#FF4D5E]/30"
                            }`}
                          >
                            {isWin ? (
                              <CheckCircle2 className="size-3" />
                            ) : (
                              <XCircle className="size-3" />
                            )}
                            {sig.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-xs text-fg-2 num mt-0.5 break-words">
                          Entry: ${sig.entry.toLocaleString()}
                          {sig.settledPrice != null && ` · Settled: $${sig.settledPrice.toLocaleString()}`}
                          {sig.suiCheckpoint && ` · Sui #${sig.suiCheckpoint.toLocaleString()}`}
                          {sig.suiDigest && ` (${sig.suiDigest.slice(0, 10)}...)`}
                        </div>
                      </div>
                    </div>

                    <div className="text-right num">
                      <div
                        className={`text-sm font-semibold ${
                          pnl >= 0 ? "text-[#19D49A]" : "text-[#FF4D5E]"
                        }`}
                      >
                        {pnl >= 0 ? "+" : ""}
                        {pnl.toFixed(2)}%
                      </div>
                      <div className="text-[11px] text-fg-3">
                        {shortDate(sig.verifiedAt || sig.verifyAt)}
                      </div>
                    </div>
                  </div>

                  {sig.postMortem && (
                    <div className="rounded-xl border border-white/5 bg-black/25 p-3 text-xs text-fg-2 leading-relaxed">
                      <span className="text-electric font-semibold mr-1.5">Walrus Post-Mortem:</span>
                      {sig.postMortem}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
      </GlassCard>
    </div>
  );
}
