"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { AISummaryCard } from "@/components/cards/AISummaryCard";
import { AIOpportunitiesCard } from "@/components/cards/AIOpportunitiesCard";
import { CandlestickChart } from "@/components/cards/CandlestickChart";
import { MarketOverviewCard } from "@/components/cards/MarketOverviewCard";
import { RecentAlertsCard } from "@/components/cards/RecentAlertsCard";
import { computeSignalPnlPct } from "@/lib/utils";
import type { Signal } from "@/lib/types";

export default function DashboardPage() {
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [tatumConfigured, setTatumConfigured] = React.useState(true);
  const [suiCheckpoint, setSuiCheckpoint] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSignals = () => {
      fetch("/api/signals")
        .then((res) => res.json())
        .then((data) => {
          setSignals(data.signals || []);
          setTatumConfigured(data.configured !== false);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    const fetchSui = () => {
      fetch("/api/network/sui")
        .then((res) => res.json())
        .then((data) => {
          if (data?.telemetry?.checkpointSequenceNumber) {
            setSuiCheckpoint(data.telemetry.checkpointSequenceNumber);
          }
        })
        .catch(() => {});
    };

    fetchSignals();
    fetchSui();

    const interval = setInterval(() => {
      fetchSignals();
      fetchSui();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const activeSignals = signals.filter((s) => s.status === "IN_PROGRESS");
  const resolvedSignals = signals.filter(
    (s) => s.status === "TARGET_REACHED" || s.status === "INVALIDATED"
  );

  const totalPnl = resolvedSignals.reduce((acc, s) => acc + computeSignalPnlPct(s), 0);

  const startDateLabel = React.useMemo(() => {
    const iso =
      signals.length > 0
        ? signals[signals.length - 1].createdAt
        : new Date().toISOString();
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [signals]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Overview
          </h1>
          <p className="text-[15px] text-fg-2 mt-1">
            24-hour verification dashboard &amp; Walrus memory
          </p>
        </div>

        {tatumConfigured && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[#19D49A]/10 border border-[#19D49A]/25 px-3 py-1.5 text-xs text-[#19D49A]">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#19D49A] opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-[#19D49A]"></span>
            </span>
            <span>
              Tatum Sui Gateway: {suiCheckpoint ? `Checkpoint #${suiCheckpoint.toLocaleString()}` : "Connected"}
            </span>
          </div>
        )}

        {!tatumConfigured && !loading && (
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/25 px-3 py-1.5 text-xs text-[#F5A623]">
            <KeyRound className="size-3.5" />
            <span>TATUM_API_KEY required for live rates &amp; verifications</span>
          </div>
        )}
      </div>

      {/* Top Row: 3 Real Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Tracked Calls"
          value={signals.length}
          suffix=" Recorded"
          deltaLabel={tatumConfigured ? "Live Tatum Feed" : "Tatum Key Required"}
          deltaPositive={tatumConfigured}
        />

        <StatCard
          label="Settled P&L"
          value={Math.abs(totalPnl)}
          prefix={totalPnl >= 0 ? "+" : "-"}
          suffix="%"
          decimals={2}
          deltaLabel={
            resolvedSignals.length > 0
              ? `${resolvedSignals.length} settled`
              : "24h window active"
          }
          deltaPositive={totalPnl >= 0}
        />

        <StatCard
          label="Active 24h Signals"
          value={activeSignals.length}
          suffix=" Active"
          deltaLabel={
            activeSignals.length > 0
              ? `${activeSignals.length} awaiting settlement`
              : "Live terminal ready"
          }
          deltaPositive={true}
        />
      </div>

      {/* Middle Row: AI Summary + AI Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-7">
          <AISummaryCard />
        </div>

        <div className="lg:col-span-5">
          <AIOpportunitiesCard />
        </div>
      </div>

      {/* Live Candlestick Chart & AI Technical Scanner */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Live Chart &amp; AI Scanner</h3>
            <p className="text-sm text-fg-2">Real-time candlesticks with 1-click quantitative AI technical analysis</p>
          </div>
        </div>
        <CandlestickChart symbol="BTC" />
      </div>

      {/* Bottom Row: Market Overview + Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        <div className="lg:col-span-8">
          <MarketOverviewCard />
        </div>

        <div className="lg:col-span-4">
          <RecentAlertsCard />
        </div>
      </div>
    </div>
  );
}
