"use client";

import * as React from "react";
import { GlassCard } from "@/components/GlassCard";
import { DeltaChip } from "@/components/DeltaChip";
import { CountUp } from "@/components/CountUp";

export interface StatCardProps {
  label: string;
  value?: number;
  displayText?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  deltaLabel: string;
  deltaPositive?: boolean;
}

export function StatCard({
  label,
  value = 0,
  displayText,
  prefix = "",
  suffix = "",
  decimals = 0,
  deltaLabel,
  deltaPositive = true,
}: StatCardProps) {
  return (
    <GlassCard interactive className="flex flex-col justify-between min-h-[146px] overflow-hidden min-w-0">
      {/* Top row: Label on left, Delta badge on right */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-fg-2 truncate">
          {label}
        </div>
        <div className="min-w-0 shrink-0">
          <DeltaChip label={deltaLabel} positive={deltaPositive} />
        </div>
      </div>

      {/* Bottom row: Value or Display Text */}
      <div className="mt-4 min-w-0">
        {displayText ? (
          <div className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold leading-tight tracking-tight text-white num break-words">
            {displayText}
          </div>
        ) : (
          <div className="text-[22px] sm:text-[24px] lg:text-[28px] font-semibold leading-tight tracking-tight text-white num break-words">
            <CountUp
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
            />
          </div>
        )}
      </div>
    </GlassCard>
  );
}
