"use client";

import * as React from "react";
import { BarChart2, TrendingUp, Layers, Wallet, RefreshCw } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import type { Signal } from "@/lib/types";

export default function TrackRecordPage() {
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [loading, setLoading] = React.useState(true);

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
  const winRate = resolved.length > 0 ? (wins / resolved.length) * 100 : 0;

  const totalPnl = resolved.reduce((acc, s) => {
    const isLong = s.direction === "LONG";
    const pnl = isLong
      ? ((s.target - s.entry) / s.entry) * 100
      : ((s.entry - s.target) / s.entry) * 100;
    return acc + pnl;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Track Record
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            Objective verification metrics and verified accuracy
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

      {/* 3 Real Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          icon={<BarChart2 className="size-4" />}
          label={`Win Rate (${wins}W / ${losses}L)`}
          value={resolved.length > 0 ? winRate : 0}
          suffix={resolved.length > 0 ? "%" : " (0/0)"}
          decimals={1}
          deltaLabel={resolved.length > 0 ? `${resolved.length} resolved calls` : "No resolved calls"}
          deltaPositive={winRate >= 50}
        />

        <StatCard
          icon={<TrendingUp className="size-4" />}
          label={`Total P&L (${resolved.length} Resolved)`}
          value={Math.abs(totalPnl)}
          prefix={totalPnl >= 0 ? "+$" : "-$"}
          decimals={2}
          deltaLabel={resolved.length > 0 ? `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}% net` : "0 verified"}
          deltaPositive={totalPnl >= 0}
        />

        <StatCard
          icon={<Layers className="size-4" />}
          label="Verification Coverage"
          value={signals.length > 0 ? Math.round((resolved.length / signals.length) * 100) : 0}
          suffix="%"
          deltaLabel={`${signals.length} total signals tracked`}
          deltaPositive={resolved.length > 0}
        />
      </div>

      {/* Portfolio / Holdings Integration Section */}
      <GlassCard variant="tint" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[16px] font-medium text-white">On-Chain Portfolio Holdings</h3>
          <span className="text-xs text-fg-3">
            Multi-chain asset tracking
          </span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-3">
          <Wallet className="size-8 text-fg-3 mx-auto" />
          <div className="text-sm font-semibold text-white">No Wallet Connected</div>
          <p className="text-xs text-fg-2 max-w-md mx-auto leading-relaxed">
            SignalRecall does not present fabricated wallet balances. To track live on-chain balances, multi-chain tokens, and wallet transaction history, connect your public address or configure wallet tracking credentials.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
