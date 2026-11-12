import type { ResolvedSignal, Signal } from "@/lib/types";

export interface ExampleSignal extends Signal {
  isExample: boolean;
  settledPrice?: number | null;
  pnlPct?: number | null;
}

export interface ExampleResolvedSignal extends ResolvedSignal {
  isExample: boolean;
}

/**
 * Fallback example signal used ONLY when no real signals exist in the database.
 * Visibly marked with a plain-text "Example" tag in the UI.
 * Never carries a "Verified" label, Sui checkpoint number, or Walrus blob ID.
 */
export const EXAMPLE_WALKTHROUGH_SIGNAL: ExampleSignal = {
  id: "example-sui-long",
  asset: "SUI",
  pair: "SUI/USD",
  direction: "LONG",
  entry: 0.84,
  target: 0.92,
  invalidation: 0.8,
  horizon: "24h",
  confidence: 78,
  status: "TARGET_REACHED",
  createdAt: "2026-11-10T09:00:00.000Z",
  verifyAt: "2026-11-11T09:00:00.000Z",
  rationale:
    "4H candle closed above the 20 EMA with rising spot volume after holding the $0.80 support zone.",
  memoryAudit: {
    summary:
      "Recalled prior SUI 4H reclaim of the 20 EMA after a volume dip, which reached its +8.5% target within 24 hours.",
    memoryIds: [],
  },
  source: "demo",
  isExample: true,
  settledPrice: 0.92,
  pnlPct: 9.52,
};

/**
 * Fallback example signal card for the hero preview panel when no real signal exists.
 */
export const EXAMPLE_HERO_SIGNAL: ExampleSignal = {
  ...EXAMPLE_WALKTHROUGH_SIGNAL,
  id: "example-hero-sui-long",
};

/**
 * Fallback 3 example settled signals for the track record strip when fewer than 3 real signals exist.
 * No Walrus blob IDs or checkpoint numbers are included.
 */
export const EXAMPLE_TRACK_RECORD_SIGNALS: ExampleResolvedSignal[] = [
  {
    id: "example-tr-1",
    asset: "SUI",
    pair: "SUI/USD",
    direction: "LONG",
    entry: 0.84,
    target: 0.92,
    settledPrice: 0.92,
    status: "TARGET_REACHED",
    createdAt: "2026-11-10T09:00:00.000Z",
    verifiedAt: "2026-11-11T09:00:00.000Z",
    pnlPct: 9.52,
    blobId: "",
    isExample: true,
  },
  {
    id: "example-tr-2",
    asset: "BTC",
    pair: "BTC/USD",
    direction: "LONG",
    entry: 72400,
    target: 75180,
    settledPrice: 75180,
    status: "TARGET_REACHED",
    createdAt: "2026-11-08T14:30:00.000Z",
    verifiedAt: "2026-11-09T14:30:00.000Z",
    pnlPct: 3.84,
    blobId: "",
    isExample: true,
  },
  {
    id: "example-tr-3",
    asset: "SOL",
    pair: "SOL/USD",
    direction: "SHORT",
    entry: 164.5,
    target: 155.0,
    settledPrice: 169.2,
    status: "INVALIDATED",
    createdAt: "2026-11-06T18:15:00.000Z",
    verifiedAt: "2026-11-07T18:15:00.000Z",
    pnlPct: -2.86,
    blobId: "",
    isExample: true,
  },
];

export interface HomepageSignalView {
  heroSignal: ExampleSignal;
  walkthroughSignal: ExampleSignal;
  trackRecordSignals: ExampleResolvedSignal[];
  realSignalCount: number;
  realSettledCount: number;
  /** Only populated once at least 10 real signals have settled. Never computed from mock data. */
  realWinRate: number | null;
  showingExamplesInTrackRecord: boolean;
  ledgerStartDate: string;
}

function toExampleSignal(sig: Signal): ExampleSignal {
  const isSettled = sig.status === "TARGET_REACHED" || sig.status === "INVALIDATED";
  const settledPrice =
    sig.status === "TARGET_REACHED"
      ? sig.target
      : sig.status === "INVALIDATED"
      ? sig.invalidation
      : null;

  let pnlPct: number | null = null;
  if (isSettled && settledPrice !== null && sig.entry > 0) {
    pnlPct =
      sig.direction === "LONG"
        ? ((settledPrice - sig.entry) / sig.entry) * 100
        : ((sig.entry - settledPrice) / sig.entry) * 100;
  }

  return {
    ...sig,
    isExample: false,
    settledPrice,
    pnlPct,
  };
}

function toResolvedSignal(sig: Signal): ExampleResolvedSignal {
  const mapped = toExampleSignal(sig);
  return {
    id: sig.id,
    userId: sig.userId,
    asset: sig.asset,
    pair: sig.pair,
    direction: sig.direction,
    entry: sig.entry,
    target: sig.target,
    settledPrice: mapped.settledPrice ?? null,
    status: sig.status,
    createdAt: sig.createdAt,
    verifiedAt:
      sig.status === "TARGET_REACHED" || sig.status === "INVALIDATED" ? sig.verifyAt : null,
    pnlPct: mapped.pnlPct ?? null,
    blobId: sig.memoryAudit?.memoryIds?.[0] || "",
    isExample: false,
  };
}

/**
 * Single data selector for the homepage.
 * Returns real signals whenever they exist, falling back to examples with `isExample: true`
 * only in empty states. Once 3 real signals exist, mock signals are never shown.
 * Once 10 real signals have settled, `realWinRate` is returned.
 */
export function getHomepageSignalData(realSignals: Signal[]): HomepageSignalView {
  const realCount = realSignals.length;
  const settledReal = realSignals.filter(
    (s) => s.status === "TARGET_REACHED" || s.status === "INVALIDATED"
  );
  const realSettledCount = settledReal.length;

  const heroSignal: ExampleSignal =
    realCount > 0 ? toExampleSignal(realSignals[0]) : EXAMPLE_HERO_SIGNAL;

  const walkthroughSignal: ExampleSignal =
    realCount > 0 ? toExampleSignal(realSignals[0]) : EXAMPLE_WALKTHROUGH_SIGNAL;

  const useRealTrackRecord = realCount >= 3;
  const trackRecordSignals: ExampleResolvedSignal[] = useRealTrackRecord
    ? realSignals.slice(0, 6).map(toResolvedSignal)
    : EXAMPLE_TRACK_RECORD_SIGNALS;

  let realWinRate: number | null = null;
  if (realSettledCount >= 10) {
    const wins = settledReal.filter((s) => s.status === "TARGET_REACHED").length;
    realWinRate = Math.round((wins / realSettledCount) * 100);
  }

  const earliestIso =
    realCount > 0 ? realSignals[realCount - 1].createdAt : new Date().toISOString();
  const ledgerStartDate = new Date(earliestIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    heroSignal,
    walkthroughSignal,
    trackRecordSignals,
    realSignalCount: realCount,
    realSettledCount,
    realWinRate,
    showingExamplesInTrackRecord: !useRealTrackRecord,
    ledgerStartDate,
  };
}
