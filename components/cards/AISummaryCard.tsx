"use client";

import * as React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";

export function AISummaryCard() {
  const [memoryCount, setMemoryCount] = React.useState<number>(0);
  const [signalCount, setSignalCount] = React.useState<number>(0);
  const [tatumConfigured, setTatumConfigured] = React.useState<boolean>(false);

  React.useEffect(() => {
    fetch("/api/walrus")
      .then((r) => r.json())
      .then((d) => setMemoryCount(d.count || 0))
      .catch(() => {});

    fetch("/api/signals")
      .then((r) => r.json())
      .then((d) => {
        setSignalCount(d.count || 0);
        setTatumConfigured(Boolean(d.configured));
      })
      .catch(() => {});
  }, []);

  return (
    <GlassCard variant="blue" interactive className="flex flex-col justify-between">
      <div>
        {/* Top Row: Title + Updated Pill */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="ring-conic flex size-7 items-center justify-center rounded-full p-[1.5px]">
              <div className="size-full rounded-full bg-[#081029] flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z"
                    fill="#2F6BFF"
                  />
                  <path
                    d="M14 15.5L17.6 22H10.4L14 15.5Z"
                    fill="#6D5EF5"
                  />
                </svg>
              </div>
            </div>
            <h3 className="text-[16px] font-medium text-white">AI Market Intelligence</h3>
          </div>

          <span className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-fg-2">
            <Clock className="size-3 text-fg-2" />
            <span>Real-time</span>
          </span>
        </div>

        {/* Dynamic Summary */}
        <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-fg-2">
          {tatumConfigured ? (
            "Live Tatum price stream is active. 24-hour verification ledger monitors all entry, target, and invalidation levels objectively without executing financial transactions."
          ) : (
            "Tatum market data provider is currently unconfigured. Add your TATUM_API_KEY to stream live spot prices and execute objective 24h post-signal settlements."
          )}
        </p>

        {/* Memory Audit Status */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-[11px] text-white/90 num">
            <span className="font-medium">Walrus Memory Vault:</span>
            <span className="text-fg-2">{memoryCount} stored blobs</span>
          </div>

          {!tatumConfigured && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[11px] text-fg-2">
              <span>Awaiting Tatum Key</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-6 flex items-center justify-between pt-2">
        <span className="text-xs font-medium text-fg-2">
          {signalCount} Tracked Calls
        </span>
        <Button asChild variant="primary" size="sm">
          <Link href="/signals">Trading Terminal</Link>
        </Button>
      </div>
    </GlassCard>
  );
}
