"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
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
  const hasTenSettled = resolved.length >= 10;
  const winRate = hasTenSettled ? (wins / resolved.length) * 100 : 0;

  const totalPnl = resolved.reduce((acc, s) => {
    const isLong = s.direction === "LONG";
    const pnl = isLong
      ? ((s.target - s.entry) / s.entry) * 100
      : ((s.entry - s.target) / s.entry) * 100;
    return acc + pnl;
  }, 0);

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

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Track Record
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            24-hour settlement metrics and ledger history
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
          label="Recorded Ledger"
          value={signals.length}
          suffix=" Calls"
          deltaLabel="Tatum 24h Settlement"
          deltaPositive={true}
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

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center space-y-2">
          <div className="text-base font-semibold text-white">No Wallet Connected</div>
          <p className="text-sm text-fg-2 max-w-md mx-auto leading-relaxed">
            SignalRecall does not present fabricated wallet balances. Connect a public address or configure wallet tracking credentials to view live on-chain balances.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
