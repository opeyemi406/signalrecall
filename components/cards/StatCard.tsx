"use client";

import * as React from "react";
import { GlassCard } from "@/components/GlassCard";
import { DeltaChip } from "@/components/DeltaChip";
import { CountUp } from "@/components/CountUp";

export interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  deltaLabel: string;
  deltaPositive?: boolean;
}

export function StatCard({
  icon,
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  deltaLabel,
  deltaPositive = true,
}: StatCardProps) {
  return (
    <GlassCard interactive className="flex flex-col justify-between min-h-[146px] overflow-hidden min-w-0">
      {/* Top row: Icon on left, Delta badge on right */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="glass-pill flex size-10 shrink-0 items-center justify-center rounded-full text-fg-2">
          {icon}
        </div>
        <div className="min-w-0 shrink-0">
          <DeltaChip label={deltaLabel} positive={deltaPositive} />
        </div>
      </div>

      {/* Bottom row: Label and value with full card width to prevent collisions */}
      <div className="mt-4 min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-fg-2 truncate">
          {label}
        </div>
        <div className="mt-1 text-[22px] sm:text-[24px] lg:text-[28px] font-semibold leading-tight tracking-tight text-white num break-words">
          <CountUp
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
          />
        </div>
      </div>
    </GlassCard>
  );
}
