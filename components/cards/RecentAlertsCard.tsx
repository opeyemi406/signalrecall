"use client";

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { timeAgo } from "@/lib/time";
import type { Alert } from "@/lib/types";

export function RecentAlertsCard() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const recent = alerts.slice(0, 5);

  return (
    <GlassCard variant="tint" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px] font-medium text-white">Recent Alerts</h3>
        <Link
          href="/alerts"
          className="text-[11px] font-semibold uppercase tracking-wider text-electric hover:text-[#6f97ff]"
        >
          {alerts.length} ACTIVE
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center space-y-2">
          <p className="text-xs text-fg-2">
            {loading ? "Loading alerts..." : "No alerts configured. Add alerts in the Alerts tab to track market events."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {recent.map((alert) => (
            <div
              key={alert.id}
              className="glass-pill flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-white">
                    {alert.title}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-2 num">
                    <span className="font-semibold text-white/80">
                      {alert.asset}
                    </span>
                    <span className="inline-flex items-center gap-1 text-fg-3">
                      <Clock className="size-3" />
                      {timeAgo(alert.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-fg-2 num">
                {alert.impactScore !== null ? `Impact ${alert.impactScore}` : "Unscored"}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
