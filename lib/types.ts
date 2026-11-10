/** Where a piece of data came from. Rendered as a badge so mock values are never mistaken for live ones. */
export type DataSource = "live" | "memory" | "model" | "demo";

export const SUPPORTED_COINS = ["BTC", "ETH", "SOL", "SUI", "BNB", "XRP"] as const;
export type CoinSymbol = (typeof SUPPORTED_COINS)[number];

export interface Asset {
  symbol: CoinSymbol;
  name: string;
  price: number;
  change24h: number; // percent
  volume24h: number; // USD
  sparkline: number[];
  source: DataSource;
  /** Set when no live price could be obtained; price is then not a real quote. */
  unavailableReason?: string;
}

export type Direction = "LONG" | "SHORT" | "NEUTRAL";
export type SignalStatus = "IN_PROGRESS" | "TARGET_REACHED" | "INVALIDATED";

export type MemoryKind = "pattern" | "catalyst" | "outcome" | "report";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface Memory {
  id: string;
  userId?: string;
  blobId: string; // Walrus blob id
  kind: MemoryKind;
  asset?: CoinSymbol;
  title: string;
  body: string;
  outcome?: string;
  storedAt: string; // ISO
  source: DataSource;
}

export interface Signal {
  id: string;
  userId?: string;
  asset: CoinSymbol;
  pair: string;
  direction: Direction;
  entry: number;
  target: number;
  invalidation: number;
  horizon: string;
  confidence: number; // 0-100
  status: SignalStatus;
  createdAt: string; // ISO
  verifyAt: string; // ISO — when the 24h Tatum check runs
  rationale: string;
  memoryAudit: { summary: string; memoryIds: string[] };
  source: DataSource;
}

export interface Opportunity {
  asset: CoinSymbol;
  name: string;
  pattern: string;
  confidence: number;
}

export type AlertType = "bullish" | "whale" | "resistance" | "volume" | "cross";

export interface Alert {
  id: string;
  userId?: string;
  type: AlertType;
  title: string;
  asset: CoinSymbol;
  createdAt: string; // ISO
  enabled: boolean;
  impactScore: number; // historical impact score 0-100 from Walrus memory
  impactNote: string;
  isAISignal: boolean;
  source: DataSource;
}

export interface Holding {
  asset: CoinSymbol;
  name: string;
  holdings: number;
  value: number;
  avgBuy: number;
  pnlPct: number;
}

export interface Allocation {
  label: CoinSymbol;
  pct: number;
  color: string;
}

export interface ResolvedSignal {
  id: string;
  userId?: string;
  asset: CoinSymbol;
  pair: string;
  direction: Direction;
  entry: number;
  target: number;
  settledPrice: number | null;
  status: SignalStatus;
  createdAt: string;
  verifiedAt: string | null;
  pnlPct: number | null;
  blobId: string;
}

export interface Candle {
  time: string | number; // YYYY-MM-DD or Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { label: string; blobId: string }[];
}
