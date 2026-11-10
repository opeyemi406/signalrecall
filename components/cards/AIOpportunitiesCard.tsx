"use client";

import * as React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/GlassCard";
import { CoinIcon } from "@/components/CoinIcon";
import { Sparkles, ArrowRight } from "lucide-react";
import type { Signal } from "@/lib/types";

export function AIOpportunitiesCard() {
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/signals")
      .then((res) => res.json())
      .then((data) => {
        setSignals(data.signals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const active = signals.filter((s) => s.status === "IN_PROGRESS").slice(0, 3);

  return (
    <GlassCard interactive className="flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-medium text-white">Active Signals</h3>
        <span className="text-[11px] text-fg-3 uppercase tracking-wider">
          24h Verification
        </span>
      </div>

      <div className="mt-4 space-y-2.5">
        {active.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center space-y-2">
            <Sparkles className="size-5 text-electric mx-auto" />
            <p className="text-xs text-fg-2">
              {loading ? "Checking active signals..." : "No active calls recorded. Create a live signal in the Trading Terminal."}
            </p>
            <Link
              href="/signals"
              className="inline-flex items-center gap-1 text-xs text-electric hover:underline font-medium pt-1"
            >
              Open Trading Terminal <ArrowRight className="size-3" />
            </Link>
          </div>
        ) : (
          active.map((sig) => (
            <Link
              key={sig.id}
              href="/signals"
              className="glass-pill flex items-center justify-between rounded-2xl px-4 py-3 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-3">
                <CoinIcon symbol={sig.asset} size={32} />
                <div>
                  <div className="text-sm font-medium text-white leading-tight">
                    {sig.asset} {sig.direction}
                  </div>
                  <div className="text-[11px] text-fg-2 leading-tight mt-0.5">
                    Target: ${sig.target.toLocaleString()} · {sig.horizon}
                  </div>
                </div>
              </div>

              <span className="text-sm font-semibold text-white num">
                {sig.confidence}%
              </span>
            </Link>
          ))
        )}
      </div>
    </GlassCard>
  );
}
