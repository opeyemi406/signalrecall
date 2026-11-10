"use client";

import * as React from "react";
import type { Allocation } from "@/lib/types";

export interface GelAllocationBarProps {
  segments: Allocation[];
}

export function GelAllocationBar({ segments }: GelAllocationBarProps) {
  return (
    <div className="space-y-3.5">
      {/* Glossy segmented bar */}
      <div className="flex h-4 w-full items-center gap-1.5 overflow-hidden rounded-full bg-white/[0.04] p-0.5">
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={
              {
                width: `${seg.pct}%`,
                "--seg": seg.color,
              } as React.CSSProperties
            }
            className="gel h-full min-w-[8px]"
            title={`${seg.label}: ${seg.pct}%`}
          />
        ))}
      </div>

      {/* Legend chips below bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fg-2 num">
        {segments.map((seg) => (
          <div key={seg.label} className="inline-flex items-center gap-1.5 shrink-0">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="font-semibold text-white">{seg.label}</span>
            <span className="text-fg-3">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
