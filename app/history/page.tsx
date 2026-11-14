"use client";

import * as React from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { StatCard } from "@/components/cards/StatCard";
import { CoinIcon } from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { shortDate } from "@/lib/time";
import { computeSignalPnlPct } from "@/lib/utils";
import { SearchContext } from "@/components/layout/AppShell";
import type { Signal, SignalStatus } from "@/lib/types";

function StatusPill({ status }: { status: SignalStatus }) {
  if (status === "TARGET_REACHED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#19D49A]/15 border border-[#19D49A]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#19D49A] shrink-0 whitespace-nowrap">
        <CheckCircle2 className="size-3 shrink-0" />
        <span>Target Reached</span>
      </span>
    );
  }
  if (status === "INVALIDATED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FF4D5E]/15 border border-[#FF4D5E]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#FF4D5E] shrink-0 whitespace-nowrap">
        <XCircle className="size-3 shrink-0" />
        <span>Invalidated</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#F5A623]/15 border border-[#F5A623]/30 px-2.5 py-0.5 text-[11px] font-medium text-[#F5A623] shrink-0 whitespace-nowrap">
      <Clock className="size-3 shrink-0" />
      <span>In Progress</span>
    </span>
  );
}

export default function HistoryPage() {
  const { query: globalQuery } = React.useContext(SearchContext);
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/signals");
      const data = await res.json();
      setSignals(data.signals || []);
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
  const wins = resolved.filter((s) => s.status === "TARGET_REACHED").length;
  const losses = resolved.filter((s) => s.status === "INVALIDATED").length;
  const hasTenSettled = resolved.length >= 10;
  const winRate = hasTenSettled ? (wins / resolved.length) * 100 : 0;

  const totalPnl = resolved.reduce((acc, s) => acc + computeSignalPnlPct(s), 0);

  const startDateLabel = React.useMemo(() => {
    const iso =
      signals.length > 0
        ? signals[signals.length - 1].createdAt
        : new Date().toISOString();
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [signals]);

  const filteredSignals = signals.filter((row) => {
    const matchesFilter =
      filter === "ALL"
        ? true
        : filter === "TARGET_REACHED"
        ? row.status === "TARGET_REACHED"
        : filter === "INVALIDATED"
        ? row.status === "INVALIDATED"
        : row.status === "IN_PROGRESS";

    const q = (search || globalQuery).trim().toLowerCase();
    const matchesSearch =
      !q ||
      row.pair.toLowerCase().includes(q) ||
      row.asset.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            History
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            24-hour verification ledger — settled and active calls
          </p>
        </div>

        <Button
          variant="glass"
          size="sm"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Ledger</span>
        </Button>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Win Rate"
          value={winRate}
          suffix="%"
          decimals={1}
          deltaLabel={
            hasTenSettled
              ? `${wins}W / ${losses}L`
              : "Available after 10 settled"
          }
          deltaPositive={true}
        />

        <StatCard
          label="Total P&L"
          value={Math.abs(totalPnl)}
          prefix={totalPnl >= 0 ? "+" : "-"}
          suffix="%"
          decimals={2}
          deltaLabel={
            resolved.length > 0
              ? `${resolved.length} settled calls`
              : "Awaiting 24h settlement"
          }
          deltaPositive={totalPnl >= 0}
        />

        <StatCard
          label="Recorded Signals"
          value={signals.length}
          suffix=" Calls"
          deltaLabel="Tatum 24h Settlement"
          deltaPositive={true}
        />
      </div>

      {/* Main Glass Ledger Container */}
      <GlassCard variant="tint" className="space-y-4">
        {/* Controls: Search + Filter Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pair, asset, or ID..."
              aria-label="Search signals"
              className="glass-pill h-10 w-full rounded-full pl-4 pr-10 text-xs text-white placeholder:text-fg-3 outline-none focus:border-electric/60"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-2" />
          </div>

          {/* Segmented Filter Pills */}
          <div className="inline-flex items-center rounded-full bg-white/[0.04] border border-white/10 p-1 self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { id: "ALL", label: "All" },
              { id: "TARGET_REACHED", label: "Target Reached" },
              { id: "INVALIDATED", label: "Invalidated" },
              { id: "IN_PROGRESS", label: "In Progress" },
            ].map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-full px-3.5 py-1 text-xs font-medium transition-all whitespace-nowrap ${
                    active
                      ? "bg-white text-ink shadow-[0_2px_12px_rgba(255,255,255,0.2)]"
                      : "text-fg-2 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Signals Table / List */}
        {filteredSignals.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-3 space-y-2">
            <p className="text-white font-medium">No signal records matching filter</p>
            <p className="text-fg-2 max-w-sm mx-auto">
              Record calls in the Trading Terminal; once the 24h verification window completes, settled results appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSignals.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CoinIcon symbol={row.asset} size={36} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {row.pair}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                          row.direction === "LONG"
                            ? "bg-[#19D49A]/15 text-[#19D49A]"
                            : "bg-[#FF4D5E]/15 text-[#FF4D5E]"
                        }`}
                      >
                        {row.direction}
                      </span>
                      <StatusPill status={row.status} />
                    </div>
                    <div className="text-xs text-fg-2 num mt-1 break-words">
                      Entry: ${row.entry.toLocaleString()} · Target: ${row.target.toLocaleString()} · Invalidation: ${row.invalidation.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 sm:gap-4 text-xs num border-t md:border-t-0 pt-2 md:pt-0 border-white/5 shrink-0">
                  <div className="text-left md:text-right">
                    <div className="text-fg-3 text-[11px]">Timestamp</div>
                    <div className="text-fg-2">{shortDate(row.createdAt)}</div>
                  </div>

                  {row.memoryAudit?.memoryIds?.[0] && (
                    <div className="inline-flex items-center gap-1 text-[11px] text-electric bg-electric/10 border border-electric/20 px-2.5 py-1 rounded-full">
                      <span className="truncate max-w-[100px]">
                        {row.memoryAudit.memoryIds[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
