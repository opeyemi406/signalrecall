import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

