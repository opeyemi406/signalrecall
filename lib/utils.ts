import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Signal } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Computes realized percentage PnL for a signal using actual settledPrice when available. */
export function computeSignalPnlPct(s: Signal): number {
  if (typeof s.pnlPct === "number" && !Number.isNaN(s.pnlPct)) {
    return s.pnlPct;
  }
  if (s.entry <= 0) return 0;
  const exitPrice =
    typeof s.settledPrice === "number" && s.settledPrice > 0
      ? s.settledPrice
      : s.status === "INVALIDATED"
      ? s.invalidation
      : s.status === "TARGET_REACHED"
      ? s.target
      : s.entry;

  const raw =
    s.direction === "LONG"
      ? ((exitPrice - s.entry) / s.entry) * 100
      : ((s.entry - exitPrice) / s.entry) * 100;
  return parseFloat(raw.toFixed(2));
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Formats a USD value; small prices keep 4 decimals. */
export function formatUsd(value: number, opts: { compact?: boolean; noCents?: boolean } = {}) {
  if (opts.compact) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  if (opts.noCents) return usd0.format(value);
  if (Math.abs(value) < 10) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);
  }
  return usd.format(value);
}

export function formatPct(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatSignedUsd(value: number, noCents = false) {
  return `${value >= 0 ? "+" : "-"}${formatUsd(Math.abs(value), { noCents })}`;
}

