"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  KeyRound,
  Layers,
  Lock,
  LogIn,
  LogOut,
  Menu,
  PieChart,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  User as UserIcon,
  X,
  Zap,
} from "lucide-react";
import { CoinIcon } from "@/components/CoinIcon";
import { CandlestickChart } from "@/components/cards/CandlestickChart";
import { formatPct, formatUsd } from "@/lib/utils";
import type { Asset, CoinSymbol, Signal } from "@/lib/types";

interface TelemetryStatus {
  tatumConfigured: boolean;
  suiConnected: boolean;
  suiCheckpoint: number | null;
  memwalConfigured: boolean;
  memwalAccountId?: string;
  openrouterConfigured: boolean;
}

export default function LandingPage() {
  const { data: session, status: authStatus } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [marketAssets, setMarketAssets] = React.useState<Asset[]>([]);
  const [marketLoading, setMarketLoading] = React.useState(true);
  const [marketTimestamp, setMarketTimestamp] = React.useState<string>("");
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [selectedChartCoin, setSelectedChartCoin] = React.useState<CoinSymbol>("BTC");
  const [status, setStatus] = React.useState<TelemetryStatus>({
    tatumConfigured: false,
    suiConnected: false,
    suiCheckpoint: null,
    memwalConfigured: false,
    openrouterConfigured: false,
  });

  // Load real-time status and live assets from actual APIs
  const loadLiveTelemetry = React.useCallback(async () => {
    try {
      const [pricesRes, suiRes, walrusRes, signalsRes] = await Promise.all([
        fetch("/api/market/prices", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ assets: [], configured: false })),
        fetch("/api/network/sui", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ telemetry: null })),
        fetch("/api/walrus", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ status: null, memories: [] })),
        fetch("/api/signals", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ signals: [], count: 0 })),
      ]);

      if (Array.isArray(pricesRes.assets) && pricesRes.assets.length > 0) {
        setMarketAssets(pricesRes.assets);
        setMarketTimestamp(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
      setMarketLoading(false);

      if (Array.isArray(signalsRes.signals)) {
        setSignals(signalsRes.signals);
      }

      setStatus({
        tatumConfigured: Boolean(pricesRes.configured),
        suiConnected: Boolean(suiRes?.telemetry?.status === "connected" || suiRes?.telemetry?.checkpointSequenceNumber),
        suiCheckpoint: suiRes?.telemetry?.checkpointSequenceNumber || null,
        memwalConfigured: Boolean(walrusRes?.status?.configured),
        memwalAccountId: walrusRes?.status?.accountId,
        openrouterConfigured: true, // Configured server-side
      });
    } catch {
      setMarketLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLiveTelemetry();
    const interval = setInterval(loadLiveTelemetry, 15000);
    return () => clearInterval(interval);
  }, [loadLiveTelemetry]);

  // Derived real metrics
  const activeSignals = signals.filter((s) => s.status === "IN_PROGRESS");
  const resolvedSignals = signals.filter((s) => s.status === "TARGET_REACHED" || s.status === "INVALIDATED");
  const winCount = signals.filter((s) => s.status === "TARGET_REACHED").length;
  const winRate = resolvedSignals.length > 0 ? Math.round((winCount / resolvedSignals.length) * 100) : 0;

  return (
    <div className="relative min-h-screen bg-[#060913] text-white selection:bg-[#2F6BFF] selection:text-white font-sans">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[800px] rounded-full bg-gradient-to-b from-[#2F6BFF]/15 via-[#19D49A]/5 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-[800px] -left-40 size-[600px] rounded-full bg-[#2F6BFF]/10 blur-3xl opacity-40" />
        <div className="absolute top-[1800px] -right-40 size-[600px] rounded-full bg-[#19D49A]/10 blur-3xl opacity-30" />
      </div>

      {/* =========================================================================
          1. HEADER & TOP NAVIGATION
      ========================================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#060913]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg
              width="26"
              height="26"
              viewBox="0 0 28 28"
              fill="none"
              className="shrink-0 transition-transform group-hover:scale-105"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="srLandingLogoGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2F6BFF" />
                </linearGradient>
              </defs>
              <path d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z" fill="url(#srLandingLogoGrad)" />
              <path d="M14 13L19.4 23H8.6L14 13Z" fill="#19D49A" fillOpacity="0.85" />
            </svg>
            <span className="text-base font-semibold tracking-tight text-white">
              Signal<span className="text-[#2F6BFF]">Recall</span>
            </span>
            <span className="hidden sm:inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-fg-2">
              v2.0
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-fg-2">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/markets" className="hover:text-white transition-colors">
              Market Intelligence
            </Link>
            <Link href="/signals" className="hover:text-white transition-colors">
              Signals
            </Link>
            <Link href="/track-record" className="hover:text-white transition-colors">
              Track Record
            </Link>
            <Link href="/memory" className="hover:text-white transition-colors">
              Walrus Vault
            </Link>
            <Link href="/alerts" className="hover:text-white transition-colors">
              Alerts
            </Link>
          </nav>

          {/* Live Telemetry Pill + Primary CTA + Auth Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Sui Gateway Live Indicator */}
            <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-mono">
              <span className={`size-1.5 rounded-full ${status.suiConnected ? "bg-[#19D49A] animate-pulse" : "bg-[#F5A623]"}`} />
              <span className="text-fg-3">Sui RPC:</span>
              <span className={status.suiConnected ? "text-[#19D49A] font-semibold" : "text-[#F5A623]"}>
                {status.suiCheckpoint ? `#${status.suiCheckpoint.toLocaleString()}` : "Active"}
              </span>
            </div>

            {/* Sign In or Signed-in User Pill */}
            {authStatus === "authenticated" && session?.user ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5">
                <div className="size-6 rounded-full overflow-hidden bg-gradient-to-tr from-[#2F6BFF] to-[#19D49A] flex items-center justify-center text-[10px] font-semibold">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="User" className="size-full object-cover" />
                  ) : (
                    session.user.name?.slice(0, 2).toUpperCase() || "U"
                  )}
                </div>
                <span className="text-xs font-medium text-white max-w-[90px] truncate">
                  {session.user.name || session.user.email?.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  title="Sign Out"
                  className="ml-1 text-fg-3 hover:text-red-400 transition-colors"
                >
                  <LogOut className="size-3" />
                </button>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-fg-2 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <LogIn className="size-3.5 text-[#2F6BFF]" />
                <span>Sign In</span>
              </Link>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#2F6BFF] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[#2F6BFF]/25 hover:bg-[#2F6BFF]/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden rounded-lg p-2 text-fg-2 hover:bg-white/5"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#0B1024]/95 p-4 space-y-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Dashboard
            </Link>
            <Link
              href="/markets"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Market Intelligence
            </Link>
            <Link
              href="/signals"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Active Signals
            </Link>
            <Link
              href="/track-record"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Track Record
            </Link>
            <Link
              href="/memory"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Walrus Memory Bank
            </Link>
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Verified History
            </Link>
            <Link
              href="/alerts"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-white/5"
            >
              Alerts
            </Link>

            <div className="pt-2 border-t border-white/10">
              {authStatus === "authenticated" && session?.user ? (
                <div className="flex items-center justify-between px-3 py-2 text-xs">
                  <span className="text-fg-2 truncate">{session.user.email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="text-red-400 font-medium hover:underline"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg bg-[#2F6BFF] px-3 py-2 text-sm font-medium text-white"
                >
                  <LogIn className="size-4" />
                  <span>Sign In with Google</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION
      ========================================================================== */}
      <section className="relative px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2F6BFF]/30 bg-[#2F6BFF]/10 px-3.5 py-1 text-xs font-mono text-[#2F6BFF]">
            <Sparkles className="size-3.5 text-[#2F6BFF]" />
            <span>Verifiable AI Trading Intelligence Grounded in Live Rates</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
            Market signals that <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-[#19D49A]">remember past patterns</span> and prove later outcomes.
          </h1>

          {/* Subheading / Product Story */}
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-fg-2 leading-relaxed">
            SignalRecall pairs real-time cryptocurrency spot rates from the <span className="text-white font-medium">Tatum Data API</span> with persistent, encrypted decentralized memory via <span className="text-white font-medium">Walrus Memory</span>. Every technical call is locked into a strict 24-hour verification window, objectively settled, and stamped with Sui checkpoint sequence proofs.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#2F6BFF] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#2F6BFF]/30 hover:bg-[#2F6BFF]/90 transition-all hover:scale-105 active:scale-95"
            >
              <span>Open Trading Terminal</span>
              <Terminal className="size-4" />
            </Link>

            <Link
              href="/signals"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/[0.08] hover:border-white/20 transition-all"
            >
              <span>Create 24h Signal</span>
              <Flame className="size-4 text-[#F5A623]" />
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium text-fg-2 hover:text-white transition-colors"
            >
              <span>How Verification Works</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. LIVE PRODUCT PREVIEW (REAL APP COMPONENTS & DATA)
      ========================================================================== */}
      <section className="relative px-4 py-8 sm:px-6 lg:px-8 border-t border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Grid: Live Candlestick Engine + Tatum Spot Rate Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Interactive TradingView Candlestick Engine */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">Interactive Chart Preview</span>
                  <span className="text-[10px] font-mono text-fg-3">TradingView lightweight-charts</span>
                </div>
                {/* Asset Selector */}
                <div className="flex items-center gap-1">
                  {(["BTC", "ETH", "SOL", "SUI"] as const).map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => setSelectedChartCoin(coin)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-colors ${
                        selectedChartCoin === coin
                          ? "bg-[#2F6BFF] text-white font-semibold"
                          : "text-fg-3 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0B1024]/70 p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
                <CandlestickChart symbol={selectedChartCoin} />
              </div>
              <p className="text-[11px] text-fg-3 px-1">
                * Candlestick OHLCV data streams from Binance API with second-level timestamps. Active forming candles update every 15 seconds.
              </p>
            </div>

            {/* Right 5 Cols: Live Tatum Spot Rates for 6 Supported Assets */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-white">Live Tatum Spot Rates (6 Core Assets)</span>
                <span className="text-[10px] font-mono text-[#19D49A]">Streaming Live</span>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0B1024]/70 p-4 backdrop-blur-xl divide-y divide-white/5">
                {marketLoading && marketAssets.length === 0 ? (
                  <div className="py-12 text-center text-xs text-fg-3">
                    <RefreshCw className="size-4 animate-spin text-[#2F6BFF] mx-auto mb-2" />
                    <span>Streaming live Tatum exchange rates...</span>
                  </div>
                ) : (
                  marketAssets.map((asset) => {
                    const up = asset.change24h >= 0;
                    return (
                      <div
                        key={asset.symbol}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <CoinIcon symbol={asset.symbol} size={32} />
                          <div>
                            <div className="text-sm font-semibold text-white">{asset.symbol}</div>
                            <div className="text-[11px] text-fg-3">{asset.name}</div>
                          </div>
                        </div>

                        <div className="text-right num">
                          <div className="text-sm font-semibold text-white">
                            {formatUsd(asset.price)}
                          </div>
                          <div
                            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                              up ? "text-[#19D49A]" : "text-[#FF4D5E]"
                            }`}
                          >
                            {up ? <ArrowUpRight className="size-3" /> : <ArrowRight className="size-3 rotate-45" />}
                            <span>{formatPct(asset.change24h)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Verified Ledger Preview Card */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">System Track Record Ledger</span>
                  <span className="text-[10px] font-mono text-fg-3">24h Settlement</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] text-fg-3 uppercase">Total Signals</div>
                    <div className="text-sm font-bold text-white mt-0.5">{signals.length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] text-fg-3 uppercase">Resolved</div>
                    <div className="text-sm font-bold text-white mt-0.5">{resolvedSignals.length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <div className="text-[10px] text-fg-3 uppercase">Win Rate</div>
                    <div className="text-sm font-bold text-[#19D49A] mt-0.5">{winRate}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. HOW IT WORKS: THE 4-STEP VERIFICATION & MEMORY LOOP
      ========================================================================== */}
      <section id="how-it-works" className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#2F6BFF]">
              System Protocol
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              The 4-Step Verification &amp; Memory Loop
            </h2>
            <p className="text-xs sm:text-sm text-fg-2">
              How SignalRecall pairs real-time price oracles with permanent decentralized memory to eliminate caller fraud and AI hallucinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors">
              <div className="size-10 rounded-xl bg-[#2F6BFF]/10 border border-[#2F6BFF]/30 flex items-center justify-center text-[#2F6BFF] font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-base font-semibold text-white">Real-Time Market Ingestion</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                Tatum Data API delivers instantaneous spot rates for core assets, while Binance streams high-frequency k-line order flow. Signal entry levels are locked against confirmed live rates.
              </p>
              <div className="text-[11px] font-mono text-fg-3 pt-2 border-t border-white/5">
                Query: Tatum /v4/data/rate
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors">
              <div className="size-10 rounded-xl bg-[#19D49A]/10 border border-[#19D49A]/30 flex items-center justify-center text-[#19D49A] font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-base font-semibold text-white">Semantic Vector Recall</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                Before generating trade rationale, the AI queries the Walrus Memory SDK (<code className="text-[11px] text-[#19D49A]">@mysten-incubation/memwal</code>) via vector search to recall past historical setups, patterns, and outcomes.
              </p>
              <div className="text-[11px] font-mono text-fg-3 pt-2 border-t border-white/5">
                Store: Walrus Memory Relayer
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors">
              <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-base font-semibold text-white">Dual-Grounded Synthesis</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                DeepSeek V4.1 Flash evaluates the setup strictly constrained by two parameters: live Tatum spot prices and recalled Walrus memory vectors. Zero price hallucinations or made-up claims.
              </p>
              <div className="text-[11px] font-mono text-fg-3 pt-2 border-t border-white/5">
                Model: DeepSeek V4.1 Flash
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors">
              <div className="size-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center text-[#F5A623] font-mono font-bold text-sm">
                04
              </div>
              <h3 className="text-base font-semibold text-white">24h Settlement &amp; Sui Proof</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                At exactly 24 hours, Tatum rates determine target hit or invalidation. The result is stamped with live Sui Checkpoint sequence numbers and recorded permanently back into Walrus Memory.
              </p>
              <div className="text-[11px] font-mono text-fg-3 pt-2 border-t border-white/5">
                Anchor: Sui Checkpoint Proofs
              </div>
            </div>
          </div>

          {/* Architecture Distinction Callout Banner */}
          <div className="rounded-2xl border border-white/10 bg-[#0B1024]/80 p-5 sm:p-6 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Database className="size-4 text-[#19D49A]" />
                <span>Architecture Clarity: What is Queried Live vs. Stored in Walrus</span>
              </div>
              <p className="text-xs text-fg-2 max-w-3xl leading-relaxed">
                <span className="text-white font-medium">Live Queries:</span> Spot rates and candlestick movements are polled live from Tatum and Binance. <br />
                <span className="text-white font-medium">Walrus Decentralized Memory:</span> Post-mortems, verified settlement proofs, encrypted trade journals, and vector embeddings are stored permanently in Walrus Memory.
              </p>
            </div>
            <Link
              href="/memory"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              <span>Explore Walrus Vault</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. ACCOUNTABILITY & TRACK RECORD
      ========================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-white/5 bg-gradient-to-b from-transparent via-white/[0.01] to-transparent">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#19D49A]">
                Cryptographic Accountability
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Zero Deletions. Objective 24-Hour Verification.
              </h2>
              <p className="text-xs sm:text-sm text-fg-2 mt-0.5 max-w-2xl">
                SignalRecall eliminates the hindsight fallacy. Every signal timestamp, entry, target, and invalidation is locked at creation.
              </p>
            </div>

            <Link
              href="/track-record"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              <span>View Full Track Record</span>
              <PieChart className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="size-8 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/30 flex items-center justify-center text-[#2F6BFF]">
                <Lock className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Immutable Horizon Lock</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                Signals cannot be edited, moved, or deleted after broadcast. The 24-hour expiration window enforces strict discipline against moving target posts.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="size-8 rounded-lg bg-[#19D49A]/10 border border-[#19D49A]/30 flex items-center justify-center text-[#19D49A]">
                <ShieldCheck className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Oracle-Settled Outcomes</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                Outcomes are computed mathematically by comparing actual Tatum spot prices against the registered threshold. No cherry-picking, no subjective claims.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
              <div className="size-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <CheckCircle2 className="size-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Sui Checkpoint Receipts</h3>
              <p className="text-xs text-fg-2 leading-relaxed">
                When a signal is settled, the exact Sui Checkpoint Sequence Number and digest are permanently bound to the receipt proof for third-party auditing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. MEMORY & CONTINUOUS LEARNING (WALRUS MEMORY SDK)
      ========================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 6 Cols: Story */}
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[#19D49A]">
                Decentralized AI Persistence
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
                Solving the LLM “Goldfish Problem” with Walrus Memory.
              </h2>
              <p className="text-xs sm:text-sm text-fg-2 leading-relaxed">
                General AI models forget everything when a chat session ends. SignalRecall natively connects to the official Walrus Memory SDK (<code className="text-white text-xs">@mysten-incubation/memwal</code>) to store encrypted trade facts, pattern observations, and post-mortems.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-[#19D49A]/15 border border-[#19D49A]/30 flex items-center justify-center text-[#19D49A] shrink-0 mt-0.5">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-white">Ed25519 Delegate Key Encryption:</span> Memories are encrypted client-side and only decryptable by authorized session delegates.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-[#19D49A]/15 border border-[#19D49A]/30 flex items-center justify-center text-[#19D49A] shrink-0 mt-0.5">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-white">Namespace Isolation:</span> Scoped memory boundaries ensure trade intelligence remains modular, auditable, and multi-user ready.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-[#19D49A]/15 border border-[#19D49A]/30 flex items-center justify-center text-[#19D49A] shrink-0 mt-0.5">
                    <CheckCircle2 className="size-3" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-white">Semantic Recall:</span> Vector search matches current chart conditions against historical patterns based on meaning, not just ticker tags.
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/memory"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-5 py-2.5 text-xs font-semibold text-white border border-white/10"
                >
                  <span>Open Walrus Memory Vault</span>
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>

            {/* Right 6 Cols: Memory Card Visualizer */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-white/10 bg-[#0B1024]/90 p-5 space-y-4 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="size-4 text-[#19D49A]" />
                    <span className="text-xs font-semibold text-white">Walrus Memory Vector Ledger</span>
                  </div>
                  <span className="text-[10px] font-mono text-fg-3">
                    Relayer: https://relayer.memory.walrus.xyz
                  </span>
                </div>

                {/* Real / Sample Memory Item */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-[#19D49A]/20 bg-[#19D49A]/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#19D49A]">[PATTERN] BTC Range Reclaim</span>
                      <span className="text-fg-3 font-mono">Distance: 0.142</span>
                    </div>
                    <p className="text-xs text-white leading-relaxed">
                      "Observed weekend liquidity grab below 4-hour support with declining funding rate followed by aggressive spot volume bounce."
                    </p>
                    <div className="text-[10px] text-fg-3 font-mono flex items-center justify-between pt-1">
                      <span>Vault: Walrus Memory Mainnet</span>
                      <span className="text-[#19D49A]">Verified Outcome: +5.4%</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-sky-400">[SETTLEMENT] SUI 24h Call</span>
                      <span className="text-fg-3 font-mono">Distance: 0.208</span>
                    </div>
                    <p className="text-xs text-fg-2 leading-relaxed">
                      "Signal SUI LONG settled at target $0.92. Oracle verified by Tatum. Anchored at Sui Checkpoint #343,658,273."
                    </p>
                    <div className="text-[10px] text-fg-3 font-mono flex items-center justify-between pt-1">
                      <span>Namespace: signalrecall</span>
                      <span className="text-[#19D49A]">TARGET_REACHED (+9.5%)</span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[11px] text-fg-3 pt-1">
                  * Vector embeddings allow DeepSeek to ground predictions in real past observations.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. DATA SOURCES & TRUST MATRIX
      ========================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-fg-3">
              Transparency Matrix
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Data Sources &amp; Roles
            </h2>
            <p className="text-xs sm:text-sm text-fg-2">
              Every data point in SignalRecall is attributed to its verified source.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Tatum Data API</span>
                <span className="text-[10px] font-mono text-[#19D49A] bg-[#19D49A]/10 px-2 py-0.5 rounded-full">Core Oracle</span>
              </div>
              <p className="text-xs text-fg-2">
                Powers real-time cryptocurrency spot exchange rates and marks settled prices at the 24-hour expiration window.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Tatum Sui Gateway</span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full">Telemetry</span>
              </div>
              <p className="text-xs text-fg-2">
                Streams live Sui Mainnet checkpoint sequence numbers and digests to timestamp verification receipts.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Walrus Memory SDK</span>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">Persistence</span>
              </div>
              <p className="text-xs text-fg-2">
                Encrypted vector memory relayer on Walrus storing historical trade patterns and post-mortems across sessions.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Binance API</span>
                <span className="text-[10px] font-mono text-[#F5A623] bg-[#F5A623]/10 px-2 py-0.5 rounded-full">K-Lines</span>
              </div>
              <p className="text-xs text-fg-2">
                Streams multi-timeframe historical candlestick OHLCV data and rolling 24-hour volume indicators.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">CoinMarketCap API</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">Metadata</span>
              </div>
              <p className="text-xs text-fg-2">
                Supplies asset metadata, official circulating supply stats, and token dilution risk analytics.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Finnhub Market Wire</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Catalysts</span>
              </div>
              <p className="text-xs text-fg-2">
                Institutional crypto headlines and Bitcoin/Ethereum ETF net flow news streaming to the market wire.
              </p>
            </div>
          </div>

          {/* Legal / Non-Custodial Disclaimer */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-4 text-[11px] text-fg-3 leading-relaxed text-center max-w-3xl mx-auto">
            <span className="font-semibold text-fg-2">Notice:</span> SignalRecall is strictly informational research software for market observation, pattern recording, and objective outcome tracking. SignalRecall does not execute trades, does not hold user funds, and does not provide financial or investment advice.
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FINAL CALL TO ACTION & FOOTER
      ========================================================================== */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-white/5 bg-gradient-to-t from-[#2F6BFF]/10 to-transparent">
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Ready to experience verifiable trading intelligence?
          </h2>
          <p className="mx-auto max-w-xl text-xs sm:text-sm text-fg-2">
            Explore live market feeds, inspect verified Sui checkpoint receipts, or submit a 24-hour signal to the tracking engine.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#2F6BFF] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-[#2F6BFF]/30 hover:bg-[#2F6BFF]/90 transition-all hover:scale-105 active:scale-95"
            >
              <span>Launch Dashboard</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/markets"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              <span>Explore Live Markets</span>
              <TrendingUp className="size-4 text-[#19D49A]" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          Multi-Column Footer (Inspired by Revoir Style)
      ========================================================================== */}
      <footer className="border-t border-white/5 bg-[#03060E] px-4 pt-16 pb-12 sm:px-6 lg:px-8 text-sm">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 pb-12">
            {/* Left Brand Column (4 Cols) */}
            <div className="md:col-span-5 space-y-4">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="size-8 rounded-xl bg-gradient-to-tr from-[#2F6BFF] to-[#60A5FA] p-1.5 flex items-center justify-center shadow-lg shadow-[#2F6BFF]/20 group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 28 28" fill="none" className="size-full">
                    <path d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z" fill="white" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight text-white">
                  SignalRecall
                </span>
              </Link>

              <p className="text-xs text-fg-3 leading-relaxed max-w-sm">
                SignalRecall pairs real-time market data with persistent decentralized memory to bring verifiable accountability to crypto trading. Built on Tatum and Walrus Memory for Sui.
              </p>

              <div className="flex items-center gap-2 pt-2 text-[11px] font-mono text-fg-3">
                <span className="size-1.5 rounded-full bg-[#19D49A]" />
                <span>Tatum Mainnet &amp; Walrus Memory Relayer</span>
              </div>
            </div>

            {/* Right 3 Navigation Columns (7 Cols) */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Column 1: Product */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Product
                </h4>
                <ul className="space-y-2.5 text-xs text-fg-3">
                  <li>
                    <Link href="/dashboard" className="hover:text-white transition-colors">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/markets" className="hover:text-white transition-colors">
                      Market Intelligence
                    </Link>
                  </li>
                  <li>
                    <Link href="/signals" className="hover:text-white transition-colors">
                      24h Signals
                    </Link>
                  </li>
                  <li>
                    <Link href="/track-record" className="hover:text-white transition-colors">
                      Track Record
                    </Link>
                  </li>
                  <li>
                    <Link href="/memory" className="hover:text-white transition-colors">
                      Walrus Vault
                    </Link>
                  </li>
                  <li>
                    <Link href="/history" className="hover:text-white transition-colors">
                      Ownership &amp; Proofs
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 2: Resources */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Resources
                </h4>
                <ul className="space-y-2.5 text-xs text-fg-3">
                  <li>
                    <a href="#how-it-works" className="hover:text-white transition-colors">
                      How it works
                    </a>
                  </li>
                  <li>
                    <Link href="/history" className="hover:text-white transition-colors">
                      Verified History
                    </Link>
                  </li>
                  <li>
                    <Link href="/alerts" className="hover:text-white transition-colors">
                      Alerts Engine
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://docs.wal.app/walrus-memory"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    >
                      <span>Walrus Memory</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.tatum.io/reference/rpc-sui"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    >
                      <span>Tatum Sui RPC</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  </li>
                </ul>
              </div>

              {/* Column 3: Terminal */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
                  Terminal
                </h4>
                <ul className="space-y-2.5 text-xs text-fg-3">
                  <li>
                    <Link href="/dashboard" className="text-white hover:text-blue-400 font-medium transition-colors">
                      Open Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/signin" className="hover:text-white transition-colors">
                      Sign in with Google
                    </Link>
                  </li>
                  <li>
                    <Link href="/signals" className="hover:text-white transition-colors">
                      Create Signal
                    </Link>
                  </li>
                  <li>
                    <Link href="/markets" className="hover:text-white transition-colors">
                      Live Ticker Stream
                    </Link>
                  </li>
                  <li>
                    <Link href="/track-record" className="hover:text-white transition-colors">
                      Performance Alpha
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://memory.walrus.xyz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-white transition-colors"
                    >
                      <span>Memory Portal</span>
                      <ExternalLink className="size-2.5" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Hackathon Stamping */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-3">
            <div>
              © {new Date().getFullYear()} SignalRecall. Verifiable On-Chain Intelligence.
            </div>
            <div className="flex items-center gap-4">
              <span>Built on Tatum Data API &amp; Walrus Memory for Sui</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
