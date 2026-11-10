"use client";

import * as React from "react";
import { BarChart2, TrendingUp, Flame, KeyRound } from "lucide-react";
import { StatCard } from "@/components/cards/StatCard";
import { AISummaryCard } from "@/components/cards/AISummaryCard";
import { AIOpportunitiesCard } from "@/components/cards/AIOpportunitiesCard";
import { MarketOverviewCard } from "@/components/cards/MarketOverviewCard";
import { RecentAlertsCard } from "@/components/cards/RecentAlertsCard";
import type { Signal } from "@/lib/types";

export default function DashboardPage() {
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [tatumConfigured, setTatumConfigured] = React.useState(false);
  const [suiCheckpoint, setSuiCheckpoint] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchSignals = () => {
      fetch("/api/signals")
        .then((res) => res.json())
        .then((data) => {
          setSignals(data.signals || []);
          setTatumConfigured(Boolean(data.configured));
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

    // Live telemetry ticker every 15 seconds
    const interval = setInterval(() => {
      fetchSignals();
      fetchSui();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const activeSignals = signals.filter((s) => s.status === "IN_PROGRESS");
  const resolvedSignals = signals.filter((s) => s.status === "TARGET_REACHED" || s.status === "INVALIDATED");

  const totalPnl = resolvedSignals.reduce((acc, s) => {
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
            Overview
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            Objective 24-hour verification dashboard &amp; decentralized memory
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
          icon={<BarChart2 className="size-4" />}
          label="Tracked Calls"
          value={signals.length}
          suffix=" Total"
          deltaLabel={tatumConfigured ? "Live Tatum Feed" : "Tatum Key Required"}
          deltaPositive={tatumConfigured}
        />

        <StatCard
          icon={<TrendingUp className="size-4" />}
          label={`Verified P&L (${resolvedSignals.length} Resolved)`}
          value={Math.abs(totalPnl)}
          prefix={totalPnl >= 0 ? "+$" : "-$"}
          decimals={2}
          deltaLabel={resolvedSignals.length > 0 ? `${totalPnl.toFixed(2)}% net` : "0 verified calls"}
          deltaPositive={totalPnl >= 0}
        />

        <StatCard
          icon={<Flame className="size-4" />}
          label="Active 24h Signals"
          value={activeSignals.length}
          suffix=" Active"
          deltaLabel={`${activeSignals.length} awaiting settlement`}
          deltaPositive={activeSignals.length > 0}
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
