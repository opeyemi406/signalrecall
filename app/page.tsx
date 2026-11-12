"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { CoinIcon } from "@/components/CoinIcon";
import { CandlestickChart } from "@/components/cards/CandlestickChart";
import { getHomepageSignalData } from "@/lib/examples";
import { countdownTo, shortDate } from "@/lib/time";
import type { Asset, CoinSymbol, Memory, Signal } from "@/lib/types";
import { formatPct, formatUsd } from "@/lib/utils";

export default function HomePage() {
  const { status: authStatus } = useSession();
  const isSignedIn = authStatus === "authenticated";

  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const heroParallaxY = useTransform(
    scrollY,
    [0, 600],
    prefersReducedMotion ? [0, 0] : [0, -22]
  );

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [marketAssets, setMarketAssets] = React.useState<Asset[]>([]);
  const [marketLoading, setMarketLoading] = React.useState(true);
  const [marketError, setMarketError] = React.useState(false);
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [selectedCoin, setSelectedCoin] = React.useState<CoinSymbol>("SUI");

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const loadLiveTelemetry = React.useCallback(async (isInitial = false) => {
    if (isInitial) setMarketLoading(true);
    try {
      const [pricesRes, signalsRes, walrusRes] = await Promise.all([
        fetch("/api/market/prices", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Price error"))))
          .catch(() => null),
        fetch("/api/signals", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : { signals: [] }))
          .catch(() => ({ signals: [] })),
        fetch("/api/walrus", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : { memories: [] }))
          .catch(() => ({ memories: [] })),
      ]);

      const validAssets = Array.isArray(pricesRes?.assets)
        ? (pricesRes.assets as Asset[]).filter(
            (a) => !a.unavailableReason && typeof a.price === "number" && a.price > 0
          )
        : [];

      if (validAssets.length > 0) {
        setMarketAssets(validAssets);
        setMarketError(false);
      } else {
        setMarketAssets([]);
        setMarketError(true);
      }

      if (Array.isArray(signalsRes?.signals)) {
        setSignals(signalsRes.signals);
      }

      if (Array.isArray(walrusRes?.memories)) {
        setMemories(walrusRes.memories);
      }
    } catch {
      setMarketError(true);
    } finally {
      setMarketLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadLiveTelemetry(true);
    const interval = setInterval(() => loadLiveTelemetry(false), 15000);
    return () => clearInterval(interval);
  }, [loadLiveTelemetry]);

  const {
    heroSignal,
    walkthroughSignal,
    trackRecordSignals,
    realSignalCount,
    realSettledCount,
    realWinRate,
    showingExamplesInTrackRecord,
    ledgerStartDate,
  } = React.useMemo(() => getHomepageSignalData(signals), [signals]);

  const sectionMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.5, ease: "easeOut" as const },
      };

  return (
    <div className="app-bg grain min-h-screen text-white font-sans selection:bg-[#2F6BFF]/45 selection:text-white">
      {/* =====================================================================
          1. NAVIGATION
      ====================================================================== */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#05060D]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <svg
              width="24"
              height="24"
              viewBox="0 0 28 28"
              fill="none"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z" fill="#2F6BFF" />
              <path d="M14 15.5L17.6 22H10.4L14 15.5Z" fill="#6D5EF5" />
            </svg>
            <span className="text-[17px] font-semibold tracking-tight text-white">
              SignalRecall
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-8 text-[15px] text-white/75"
          >
            <a href="#product" className="hover:text-white transition-colors">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
            </a>
            <a href="#track-record" className="hover:text-white transition-colors">
              Track record
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/30 pl-4 pr-1.5 py-1.5 text-[14px] font-medium text-white hover:bg-white/[0.06] transition-colors"
              >
                <span>Dashboard</span>
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
                  <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/30 pl-4 pr-1.5 py-1.5 text-[14px] font-medium text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <span>Sign in</span>
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
                  <ArrowRight className="size-3.5" />
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center rounded-full p-2 text-white/70 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-[#05060D]/95 px-5 py-4 space-y-3 text-base">
            <a
              href="#product"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white/80 hover:text-white"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white/80 hover:text-white"
            >
              How it works
            </a>
            <a
              href="#track-record"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-white/80 hover:text-white"
            >
              Track record
            </a>
          </div>
        )}
      </header>

      <main>
        {/* ===================================================================
            2. HERO SECTION (Asymmetric Split + Tilted Real Dashboard UI)
        ==================================================================== */}
        <motion.section
          id="product"
          {...sectionMotionProps}
          className="relative mx-auto max-w-[1200px] px-5 pt-16 pb-[120px] sm:px-8 lg:pt-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Hero Copy (5 Columns on Desktop) */}
            <div className="lg:col-span-5 space-y-6">
              <h1 className="text-[44px] sm:text-[56px] lg:text-[64px] font-semibold leading-[1.06] tracking-[-0.03em] text-white">
                Signals with a memory and a receipt.
              </h1>

              <p className="text-[18px] sm:text-[20px] leading-[1.65] text-white/80 max-w-lg font-normal">
                Live Tatum spot prices, past market setups recalled from Walrus, and an automatic 24-hour settlement check.
              </p>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                {isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-3 rounded-full bg-[#F7F5EE] hover:bg-white pl-6 pr-2 py-2.5 text-[15px] font-semibold text-[#05060D] transition-colors"
                  >
                    <span>Dashboard</span>
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#05060D] text-[#F7F5EE]">
                      <ArrowRight className="size-4" />
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="inline-flex items-center gap-3 rounded-full bg-[#F7F5EE] hover:bg-white pl-6 pr-2 py-2.5 text-[15px] font-semibold text-[#05060D] transition-colors cursor-pointer"
                  >
                    <span>Continue with Google</span>
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#05060D] text-[#F7F5EE]">
                      <ArrowRight className="size-4" />
                    </span>
                  </button>
                )}

                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-1.5 text-[15px] font-medium text-white/75 hover:text-white transition-colors"
                >
                  <span>See how it works</span>
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>

            {/* Hero Live Dashboard Glass Panel (7 Columns on Desktop, Tilted >=1024px) */}
            <div className="lg:col-span-7 relative">
              {/* Soft Blue Glow Behind Panel */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-full bg-[#2F6BFF]/20 blur-[90px]"
              />

              <motion.div
                style={{ y: heroParallaxY }}
                className="relative lg:[transform:perspective(1800px)_rotateX(14deg)_rotateY(-18deg)] transition-transform duration-500"
              >
                <div className="glass p-4 sm:p-5 space-y-4">
                  {/* Live Ticker Bar (Tatum) */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                    <span className="text-[13px] font-medium text-white/75 shrink-0">
                      Tatum Spot Feed
                    </span>

                    {marketLoading && marketAssets.length === 0 ? (
                      <div className="flex items-center gap-1.5 text-[13px] text-white/70">
                        <RefreshCw className="size-3.5 animate-spin text-[#2F6BFF]" />
                        <span>Connecting live price feed...</span>
                      </div>
                    ) : marketError || marketAssets.length === 0 ? (
                      <div className="flex items-center gap-2 text-[13px] text-white/70">
                        <RefreshCw className="size-3.5 animate-spin text-[#2F6BFF]" />
                        <span>Price feed unavailable, retrying</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                        {marketAssets.slice(0, 4).map((asset) => {
                          const up = asset.change24h >= 0;
                          const active = selectedCoin === asset.symbol;
                          return (
                            <button
                              key={asset.symbol}
                              type="button"
                              onClick={() => setSelectedCoin(asset.symbol)}
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] transition-colors shrink-0 num ${
                                active
                                  ? "liquid text-white"
                                  : "glass-pill text-white/85 hover:text-white"
                              }`}
                            >
                              <CoinIcon symbol={asset.symbol} size={16} />
                              <span className="font-medium">{asset.symbol}</span>
                              <span>{formatUsd(asset.price)}</span>
                              <span
                                className={`inline-flex items-center gap-0.5 text-xs ${
                                  up ? "text-[#19D49A]" : "text-[#FF4D5E]"
                                }`}
                              >
                                {up ? (
                                  <ArrowUpRight className="size-3" />
                                ) : (
                                  <ArrowDownRight className="size-3" />
                                )}
                                {formatPct(asset.change24h)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Real Live Candlestick Chart (Binance) */}
                  <div>
                    <CandlestickChart
                      symbol={selectedCoin}
                      entryPrice={
                        !heroSignal.isExample && heroSignal.asset === selectedCoin
                          ? heroSignal.entry
                          : 0
                      }
                    />
                  </div>

                  {/* Most Recent Signal Card (Real or Marked Fallback Example) */}
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <CoinIcon symbol={heroSignal.asset} size={22} />
                        <span className="text-[15px] font-medium text-white">
                          {heroSignal.pair} · {heroSignal.direction}
                        </span>
                        <span className="text-[13px] text-white/75 num">
                          Entry {formatUsd(heroSignal.entry)} → Target{" "}
                          {formatUsd(heroSignal.target)} (Stop{" "}
                          {formatUsd(heroSignal.invalidation)})
                        </span>
                      </div>

                      {heroSignal.isExample ? (
                        <span className="text-[13px] text-white/55">Example</span>
                      ) : (
                        <span className="text-[13px] text-white/75 num">
                          {heroSignal.status === "IN_PROGRESS"
                            ? `24h check in ${countdownTo(heroSignal.verifyAt)}`
                            : heroSignal.status === "TARGET_REACHED"
                            ? "Target reached"
                            : "Invalidated"}
                        </span>
                      )}
                    </div>

                    <div className="text-[14px] text-white/80 leading-[1.6]">
                      <span className="text-white font-medium">Memory Audit: </span>
                      {heroSignal.memoryAudit.summary}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================================
            3. SIGNAL WALKTHROUGH (Horizontal Timeline: Call → Recall → Settle)
        ==================================================================== */}
        <motion.section
          id="how-it-works"
          {...sectionMotionProps}
          className="mx-auto max-w-[1200px] px-5 py-[100px] sm:px-8 border-t border-white/[0.08]"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div className="space-y-3 max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-white">
                Every call follows a three-step record
              </h2>
              <p className="text-[18px] sm:text-[19px] leading-[1.65] text-white/80">
                {realSignalCount === 0
                  ? "No live signals have been created in this workspace yet. Below is how a signal moves from entry to 24-hour settlement."
                  : "Built directly from the latest recorded signal in your ledger."}
              </p>
            </div>

            {walkthroughSignal.isExample && (
              <span className="text-sm text-white/55 shrink-0">Example</span>
            )}
          </div>

          <div className="glass p-6 sm:p-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div className="flex items-center gap-3">
                <CoinIcon symbol={walkthroughSignal.asset} size={36} />
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[18px] font-semibold text-white">
                      {walkthroughSignal.pair} {walkthroughSignal.direction}
                    </span>
                    <span className="text-[14px] text-white/70 num">
                      {walkthroughSignal.horizon} window
                    </span>
                  </div>
                  <div className="text-[15px] text-white/80 mt-1 leading-relaxed">
                    {walkthroughSignal.rationale}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                {walkthroughSignal.isExample ? (
                  <span className="text-white/55">Example</span>
                ) : (
                  <span className="text-white/75 num">
                    Recorded {shortDate(walkthroughSignal.createdAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 relative">
              {/* Step 1: Call */}
              <div className="space-y-3.5 lg:pr-4">
                <div className="flex items-center justify-between text-[13px] text-white/70">
                  <span className="font-mono uppercase tracking-wider text-[#2F6BFF] font-semibold">
                    1. Call
                  </span>
                  <span>Tatum Spot Price</span>
                </div>
                <h3 className="text-[18px] font-semibold text-white">
                  Lock entry, target, and stop
                </h3>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  At creation, the live spot quote is recorded from Tatum along with fixed target and invalidation thresholds.
                </p>
                <div className="grid grid-cols-3 gap-2.5 pt-2 num">
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="text-xs text-white/60">Entry</div>
                    <div className="text-[15px] font-semibold text-white mt-0.5">
                      {formatUsd(walkthroughSignal.entry)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="text-xs text-white/60">Target</div>
                    <div className="text-[15px] font-semibold text-[#19D49A] mt-0.5">
                      {formatUsd(walkthroughSignal.target)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="text-xs text-white/60">Invalidation</div>
                    <div className="text-[15px] font-semibold text-[#FF4D5E] mt-0.5">
                      {formatUsd(walkthroughSignal.invalidation)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Recall */}
              <div className="space-y-3.5 lg:border-l lg:border-white/[0.08] lg:pl-8 lg:pr-4">
                <div className="flex items-center justify-between text-[13px] text-white/70">
                  <span className="font-mono uppercase tracking-wider text-[#6D5EF5] font-semibold">
                    2. Recall
                  </span>
                  <span>Walrus Memory</span>
                </div>
                <h3 className="text-[18px] font-semibold text-white">
                  Check prior patterns before committing
                </h3>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  SignalRecall searches stored notes and prior trade outcomes in Walrus Memory to surface historical context for the asset.
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-[15px] text-white/85 leading-[1.65]">
                  “{walkthroughSignal.memoryAudit.summary}”
                </div>
              </div>

              {/* Step 3: Settle */}
              <div className="space-y-3.5 lg:border-l lg:border-white/[0.08] lg:pl-8">
                <div className="flex items-center justify-between text-[13px] text-white/70">
                  <span className="font-mono uppercase tracking-wider text-[#2F6BFF] font-semibold">
                    3. Settle
                  </span>
                  <span>24-Hour Check</span>
                </div>
                <h3 className="text-[18px] font-semibold text-white">
                  Compare 24h price against thresholds
                </h3>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  After 24 hours, the spot rate from Tatum settles the call as target reached or invalidated and writes the outcome back to memory.
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 flex items-center justify-between num">
                  <div>
                    <div className="text-xs text-white/60">
                      {walkthroughSignal.status === "IN_PROGRESS"
                        ? "Settlement countdown"
                        : "24h outcome"}
                    </div>
                    <div className="text-[15px] font-semibold text-white mt-0.5">
                      {walkthroughSignal.status === "IN_PROGRESS"
                        ? countdownTo(walkthroughSignal.verifyAt)
                        : walkthroughSignal.status === "TARGET_REACHED"
                        ? `Target reached (${formatUsd(
                            walkthroughSignal.settledPrice ?? walkthroughSignal.target
                          )})`
                        : `Invalidated (${formatUsd(
                            walkthroughSignal.settledPrice ?? walkthroughSignal.invalidation
                          )})`}
                    </div>
                  </div>

                  {walkthroughSignal.pnlPct !== null &&
                    walkthroughSignal.pnlPct !== undefined && (
                      <span
                        className={`text-[15px] font-semibold ${
                          walkthroughSignal.pnlPct >= 0
                            ? "text-[#19D49A]"
                            : "text-[#FF4D5E]"
                        }`}
                      >
                        {formatPct(walkthroughSignal.pnlPct)}
                      </span>
                    )}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================================
            4. SYSTEM PROTOCOL: THE 4-STEP VERIFICATION & MEMORY LOOP
        ==================================================================== */}
        <motion.section
          {...sectionMotionProps}
          className="mx-auto max-w-[1200px] px-5 py-[100px] sm:px-8 border-t border-white/[0.08]"
        >
          <div className="space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-sm font-mono uppercase tracking-wider text-[#2F6BFF]">
                System Protocol
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white">
                The 4-Step Verification &amp; Memory Loop
              </h2>
              <p className="text-[17px] sm:text-[19px] leading-[1.65] text-white/80 font-normal">
                How SignalRecall pairs real-time price oracles with permanent decentralized memory to eliminate caller fraud and AI hallucinations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 01 */}
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[#2F6BFF] font-mono font-bold text-base">
                    01
                  </div>
                  <h3 className="text-[18px] font-semibold text-white">
                    Real-Time Market Ingestion
                  </h3>
                  <p className="text-[15px] text-white/80 leading-[1.65]">
                    Tatum Data API delivers instantaneous spot rates for core assets, while Binance streams high-frequency k-line order flow. Signal entry levels are locked against confirmed live rates.
                  </p>
                </div>
                <div className="text-[13px] font-mono text-white/55 pt-3 border-t border-white/[0.06]">
                  Query: Tatum /v4/data/rate
                </div>
              </div>

              {/* Step 02 */}
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[#6D5EF5] font-mono font-bold text-base">
                    02
                  </div>
                  <h3 className="text-[18px] font-semibold text-white">
                    Semantic Vector Recall
                  </h3>
                  <p className="text-[15px] text-white/80 leading-[1.65]">
                    Before generating trade rationale, the AI queries the Walrus Memory SDK (
                    <code className="text-[13px] text-white/95">@mysten-incubation/memwal</code>
                    ) via vector search to recall past historical setups, patterns, and outcomes.
                  </p>
                </div>
                <div className="text-[13px] font-mono text-white/55 pt-3 border-t border-white/[0.06]">
                  Store: Walrus Memory Relayer
                </div>
              </div>

              {/* Step 03 */}
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[#2F6BFF] font-mono font-bold text-base">
                    03
                  </div>
                  <h3 className="text-[18px] font-semibold text-white">
                    Dual-Grounded Synthesis
                  </h3>
                  <p className="text-[15px] text-white/80 leading-[1.65]">
                    DeepSeek V4.1 Flash evaluates the setup strictly constrained by two parameters: live Tatum spot prices and recalled Walrus memory vectors. Zero price hallucinations or made-up claims.
                  </p>
                </div>
                <div className="text-[13px] font-mono text-white/55 pt-3 border-t border-white/[0.06]">
                  Model: DeepSeek V4.1 Flash
                </div>
              </div>

              {/* Step 04 */}
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4 hover:border-white/20 transition-colors flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="text-[#6D5EF5] font-mono font-bold text-base">
                    04
                  </div>
                  <h3 className="text-[18px] font-semibold text-white">
                    24h Settlement &amp; Sui Proof
                  </h3>
                  <p className="text-[15px] text-white/80 leading-[1.65]">
                    At exactly 24 hours, Tatum rates determine target hit or invalidation. The result is stamped with live Sui Checkpoint sequence numbers and recorded permanently back into Walrus Memory.
                  </p>
                </div>
                <div className="text-[13px] font-mono text-white/55 pt-3 border-t border-white/[0.06]">
                  Anchor: Sui Checkpoint Proofs
                </div>
              </div>
            </div>

            {/* Architecture Clarity Callout Banner */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0B1024]/80 p-6 sm:p-7 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="text-[16px] sm:text-[17px] font-semibold text-white">
                  Architecture Clarity: What is Queried Live vs. Stored in Walrus
                </div>
                <p className="text-[15px] sm:text-[16px] text-white/80 max-w-3xl leading-[1.65]">
                  <span className="text-white font-semibold">Live Queries:</span> Spot rates and candlestick movements are polled live from Tatum and Binance.{" "}
                  <br className="hidden sm:inline" />
                  <span className="text-white font-semibold">Walrus Decentralized Memory:</span> Post-mortems, verified settlement proofs, encrypted trade journals, and vector embeddings are stored permanently in Walrus Memory.
                </p>
              </div>
              <Link
                href="/memory"
                className="shrink-0 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <span>Explore Walrus Vault</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ===================================================================
            5. CRYPTOGRAPHIC ACCOUNTABILITY & TRACK RECORD LEDGER
        ==================================================================== */}
        <motion.section
          id="track-record"
          {...sectionMotionProps}
          className="mx-auto max-w-[1200px] px-5 py-[100px] sm:px-8 border-t border-white/[0.08]"
        >
          <div className="space-y-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="text-sm font-mono uppercase tracking-wider text-[#2F6BFF]">
                  Cryptographic Accountability
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  Zero Deletions. Objective 24-Hour Verification.
                </h2>
                <p className="text-[17px] sm:text-[19px] leading-[1.65] text-white/80 font-normal">
                  SignalRecall eliminates the hindsight fallacy. Every signal timestamp, entry, target, and invalidation is locked at creation.
                </p>
              </div>

              <Link
                href="/track-record"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <span>View Full Track Record</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3">
                <h3 className="text-[18px] font-semibold text-white">
                  Immutable Horizon Lock
                </h3>
                <p className="text-[15px] sm:text-[16px] text-white/80 leading-[1.65]">
                  Signals cannot be edited, moved, or deleted after broadcast. The 24-hour expiration window enforces strict discipline against moving target posts.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3">
                <h3 className="text-[18px] font-semibold text-white">
                  Oracle-Settled Outcomes
                </h3>
                <p className="text-[15px] sm:text-[16px] text-white/80 leading-[1.65]">
                  Outcomes are computed mathematically by comparing actual Tatum spot prices against the registered threshold. No cherry-picking, no subjective claims.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-3">
                <h3 className="text-[18px] font-semibold text-white">
                  Sui Checkpoint Receipts
                </h3>
                <p className="text-[15px] sm:text-[16px] text-white/80 leading-[1.65]">
                  When a signal is settled, the exact Sui Checkpoint Sequence Number and digest are permanently bound to the receipt proof for third-party auditing.
                </p>
              </div>
            </div>

            {/* Live Track Record Strip (Real Data Rule) */}
            <div className="glass overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] border-b border-white/[0.08] bg-white/[0.02]">
                <div className="p-5 sm:p-6">
                  <div className="text-[13px] text-white/65">Recorded signals</div>
                  <div className="text-[18px] font-semibold text-white mt-1 num">
                    {realSignalCount > 0
                      ? `${realSignalCount} recorded since ${ledgerStartDate}`
                      : `Tracking live since ${ledgerStartDate}`}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="text-[13px] text-white/65">Settled after 24h</div>
                  <div className="text-[18px] font-semibold text-white mt-1 num">
                    {realSettledCount > 0
                      ? `${realSettledCount} settled`
                      : `24h settlement active`}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="text-[13px] text-white/65">Settlement status</div>
                  <div className="text-[18px] font-medium text-white mt-1 num">
                    {realWinRate !== null
                      ? `Win rate ${realWinRate}%`
                      : showingExamplesInTrackRecord
                      ? "3 example signals shown"
                      : `Available after 10 settled (${ledgerStartDate})`}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/[0.08]">
                {trackRecordSignals.map((sig) => {
                  const hasPnl = sig.pnlPct !== null && sig.pnlPct !== undefined;
                  const positive = (sig.pnlPct ?? 0) >= 0;

                  return (
                    <div
                      key={sig.id}
                      className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 text-[15px]"
                    >
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <CoinIcon symbol={sig.asset} size={24} />
                        <span className="font-medium text-white">{sig.pair}</span>
                        <span className="text-[13px] text-white/70">{sig.direction}</span>
                      </div>

                      <div className="text-[14px] text-white/75 num">
                        Entry {formatUsd(sig.entry)} →{" "}
                        {sig.settledPrice !== null
                          ? `Settled ${formatUsd(sig.settledPrice)}`
                          : `Target ${formatUsd(sig.target)}`}
                      </div>

                      <div className="flex items-center gap-4 ml-auto num">
                        <span className="text-[14px] text-white/80">
                          {sig.status === "TARGET_REACHED"
                            ? "Target reached"
                            : sig.status === "INVALIDATED"
                            ? "Invalidated"
                            : "In progress"}
                        </span>

                        {hasPnl && (
                          <span
                            className={`text-[14px] font-semibold min-w-[60px] text-right ${
                              positive ? "text-[#19D49A]" : "text-[#FF4D5E]"
                            }`}
                          >
                            {formatPct(sig.pnlPct!)}
                          </span>
                        )}

                        {sig.isExample ? (
                          <span className="text-[13px] text-white/55">Example</span>
                        ) : (
                          <span className="text-[13px] text-white/55">
                            {shortDate(sig.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================================
            6. DECENTRALIZED AI PERSISTENCE (WALRUS MEMORY SDK)
        ==================================================================== */}
        <motion.section
          {...sectionMotionProps}
          className="mx-auto max-w-[1200px] px-5 py-[100px] sm:px-8 border-t border-white/[0.08]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left 6 Cols */}
            <div className="lg:col-span-6 space-y-5">
              <span className="text-sm font-mono uppercase tracking-wider text-[#6D5EF5]">
                Decentralized AI Persistence
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                Solving the LLM “Goldfish Problem” with Walrus Memory.
              </h2>
              <p className="text-[16px] sm:text-[18px] text-white/80 leading-[1.65] font-normal">
                General AI models forget everything when a chat session ends. SignalRecall natively connects to the official Walrus Memory SDK (
                <code className="text-white text-[15px]">@mysten-incubation/memwal</code>
                ) to store encrypted trade facts, pattern observations, and post-mortems.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 text-[15px] sm:text-[16px] leading-[1.65]">
                  <CheckCircle2 className="size-5 text-[#2F6BFF] shrink-0 mt-1" />
                  <div>
                    <span className="font-semibold text-white">
                      Ed25519 Delegate Key Encryption:
                    </span>{" "}
                    <span className="text-white/80">
                      Memories are encrypted client-side and only decryptable by authorized session delegates.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-[15px] sm:text-[16px] leading-[1.65]">
                  <CheckCircle2 className="size-5 text-[#2F6BFF] shrink-0 mt-1" />
                  <div>
                    <span className="font-semibold text-white">
                      Namespace Isolation:
                    </span>{" "}
                    <span className="text-white/80">
                      Scoped memory boundaries ensure trade intelligence remains modular, auditable, and multi-user ready.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-[15px] sm:text-[16px] leading-[1.65]">
                  <CheckCircle2 className="size-5 text-[#2F6BFF] shrink-0 mt-1" />
                  <div>
                    <span className="font-semibold text-white">
                      Semantic Recall:
                    </span>{" "}
                    <span className="text-white/80">
                      Vector search matches current chart conditions against historical patterns based on meaning, not just ticker tags.
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/memory"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 px-5 py-2.5 text-[14px] font-semibold text-white border border-white/10 transition-colors"
                >
                  <span>Open Walrus Memory Vault</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            </div>

            {/* Right 6 Cols: Walrus Memory Vector Ledger */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-white/[0.08] bg-[#0B1024]/90 p-6 space-y-4 backdrop-blur-xl shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5">
                  <span className="text-[15px] font-semibold text-white">
                    Walrus Memory Vector Ledger
                  </span>
                  <span className="text-xs font-mono text-white/60">
                    Relayer: https://relayer.memory.walrus.xyz
                  </span>
                </div>

                {memories.length > 0 ? (
                  <div className="space-y-3.5">
                    {memories.slice(0, 2).map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-2"
                      >
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-semibold text-[#2F6BFF]">
                            [{m.kind.toUpperCase()}] {m.title}
                          </span>
                          <span className="text-white/55 font-mono">
                            {shortDate(m.storedAt)}
                          </span>
                        </div>
                        <p className="text-[15px] text-white/85 leading-[1.6]">
                          &ldquo;{m.body}&rdquo;
                        </p>
                        {m.outcome && (
                          <div className="text-xs text-white/60 font-mono flex items-center justify-between pt-1">
                            <span>Vault: Walrus Memory Mainnet</span>
                            <span className="text-[#19D49A]">{m.outcome}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-xl border border-[#2F6BFF]/25 bg-[#2F6BFF]/5 space-y-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-[#2F6BFF]">
                          [PATTERN] BTC Range Reclaim
                        </span>
                        <div className="flex items-center gap-2 font-mono text-white/60">
                          <span>Distance: 0.142</span>
                          <span>Example</span>
                        </div>
                      </div>
                      <p className="text-[15px] text-white leading-[1.6]">
                        &ldquo;Observed weekend liquidity grab below 4-hour support with declining funding rate followed by aggressive spot volume bounce.&rdquo;
                      </p>
                      <div className="text-xs text-white/60 font-mono flex items-center justify-between pt-1">
                        <span>Vault: Walrus Memory Mainnet</span>
                        <span className="text-[#19D49A]">Verified Outcome: +5.4%</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-semibold text-[#6D5EF5]">
                          [SETTLEMENT] SUI 24h Call
                        </span>
                        <div className="flex items-center gap-2 font-mono text-white/60">
                          <span>Distance: 0.208</span>
                          <span>Example</span>
                        </div>
                      </div>
                      <p className="text-[15px] text-white/85 leading-[1.6]">
                        &ldquo;Signal SUI LONG settled at target $0.92. Oracle verified by Tatum. Anchored at Sui Checkpoint #343,658,273.&rdquo;
                      </p>
                      <div className="text-xs text-white/60 font-mono flex items-center justify-between pt-1">
                        <span>Namespace: signalrecall</span>
                        <span className="text-[#19D49A]">TARGET_REACHED (+9.5%)</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center text-[13px] text-white/60 pt-1">
                  * Vector embeddings allow DeepSeek to ground predictions in real past observations.
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================================
            7. TRANSPARENCY MATRIX: DATA SOURCES & ROLES
        ==================================================================== */}
        <motion.section
          {...sectionMotionProps}
          className="mx-auto max-w-[1200px] px-5 py-[100px] sm:px-8 border-t border-white/[0.08]"
        >
          <div className="space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2.5">
              <span className="text-sm font-mono uppercase tracking-wider text-white/60">
                Transparency Matrix
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Data Sources &amp; Roles
              </h2>
              <p className="text-[17px] sm:text-[19px] leading-[1.65] text-white/80 font-normal">
                Every data point in SignalRecall is attributed to its verified source.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-white">Tatum Data API</span>
                  <span className="text-xs font-mono text-[#2F6BFF] bg-[#2F6BFF]/10 px-2.5 py-0.5 rounded-full">
                    Core Oracle
                  </span>
                </div>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  Powers real-time cryptocurrency spot exchange rates and marks settled prices at the 24-hour expiration window.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-white">Tatum Sui Gateway</span>
                  <span className="text-xs font-mono text-[#2F6BFF] bg-[#2F6BFF]/10 px-2.5 py-0.5 rounded-full">
                    Telemetry
                  </span>
                </div>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  Streams live Sui Mainnet checkpoint sequence numbers and digests to timestamp verification receipts.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-white">Walrus Memory SDK</span>
                  <span className="text-xs font-mono text-[#6D5EF5] bg-[#6D5EF5]/10 px-2.5 py-0.5 rounded-full">
                    Persistence
                  </span>
                </div>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  Encrypted vector memory relayer on Walrus storing historical trade patterns and post-mortems across sessions.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-white">Binance API</span>
                  <span className="text-xs font-mono text-[#2F6BFF] bg-[#2F6BFF]/10 px-2.5 py-0.5 rounded-full">
                    K-Lines
                  </span>
                </div>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  Streams multi-timeframe historical candlestick OHLCV data and rolling 24-hour volume indicators.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-white">CoinMarketCap API</span>
                  <span className="text-xs font-mono text-[#6D5EF5] bg-[#6D5EF5]/10 px-2.5 py-0.5 rounded-full">
                    Metadata
                  </span>
                </div>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  Supplies asset metadata, official circulating supply stats, and token dilution risk analytics.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-semibold text-white">Finnhub Market Wire</span>
                  <span className="text-xs font-mono text-[#2F6BFF] bg-[#2F6BFF]/10 px-2.5 py-0.5 rounded-full">
                    Catalysts
                  </span>
                </div>
                <p className="text-[15px] text-white/80 leading-[1.65]">
                  Institutional crypto headlines and Bitcoin/Ethereum ETF net flow news streaming to the market wire.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-5 text-[14px] text-white/70 leading-[1.65] text-center max-w-3xl mx-auto">
              <span className="font-semibold text-white">Notice:</span> SignalRecall is strictly informational research software for market observation, pattern recording, and objective outcome tracking. SignalRecall does not execute trades, does not hold user funds, and does not provide financial or investment advice.
            </div>
          </div>
        </motion.section>

        {/* ===================================================================
            8. FINAL CALL TO ACTION
        ==================================================================== */}
        <motion.section
          {...sectionMotionProps}
          className="relative px-5 py-20 sm:px-8 border-t border-white/[0.08] bg-gradient-to-t from-[#2F6BFF]/10 to-transparent"
        >
          <div className="mx-auto max-w-4xl text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white">
              Ready to experience verifiable trading intelligence?
            </h2>
            <p className="mx-auto max-w-2xl text-[17px] sm:text-[19px] leading-[1.65] text-white/80 font-normal">
              Explore live market feeds, inspect verified Sui checkpoint receipts, or submit a 24-hour signal to the tracking engine.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {isSignedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-3 rounded-full bg-[#F7F5EE] hover:bg-white pl-6 pr-2 py-2.5 text-[15px] font-semibold text-[#05060D] transition-colors"
                >
                  <span>Dashboard</span>
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#05060D] text-[#F7F5EE]">
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-3 rounded-full bg-[#F7F5EE] hover:bg-white pl-6 pr-2 py-2.5 text-[15px] font-semibold text-[#05060D] transition-colors cursor-pointer"
                >
                  <span>Continue with Google</span>
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#05060D] text-[#F7F5EE]">
                    <ArrowRight className="size-4" />
                  </span>
                </button>
              )}

              <Link
                href="/markets"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/10 transition-colors"
              >
                <span>Explore Live Markets</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </motion.section>
      </main>

      {/* =====================================================================
          9. MULTI-COLUMN FOOTER
      ====================================================================== */}
      <footer className="border-t border-white/[0.08] bg-[#03060E] px-5 pt-16 pb-12 sm:px-8 text-[15px]">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 pb-12">
            {/* Left Brand Column */}
            <div className="md:col-span-5 space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 28 28"
                  fill="none"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  <path d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z" fill="#2F6BFF" />
                  <path d="M14 15.5L17.6 22H10.4L14 15.5Z" fill="#6D5EF5" />
                </svg>
                <span className="text-lg font-bold tracking-tight text-white">
                  SignalRecall
                </span>
              </Link>

              <p className="text-[14px] text-white/70 leading-[1.65] max-w-sm">
                SignalRecall pairs real-time market data with persistent decentralized memory to bring verifiable accountability to crypto trading. Built on Tatum and Walrus Memory for Sui.
              </p>

              <div className="flex items-center gap-2 pt-2 text-[13px] font-mono text-white/65">
                <span className="size-1.5 rounded-full bg-[#19D49A]" />
                <span>Tatum Mainnet &amp; Walrus Memory Relayer</span>
              </div>
            </div>

            {/* Right 3 Navigation Columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Column 1: Product */}
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white">
                  Product
                </h4>
                <ul className="space-y-2.5 text-[14px] text-white/70">
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
                <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white">
                  Resources
                </h4>
                <ul className="space-y-2.5 text-[14px] text-white/70">
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
                      <ExternalLink className="size-3" />
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
                      <ExternalLink className="size-3" />
                    </a>
                  </li>
                </ul>
              </div>

              {/* Column 3: Terminal */}
              <div className="space-y-3.5">
                <h4 className="text-[13px] font-semibold uppercase tracking-wider text-white">
                  Terminal
                </h4>
                <ul className="space-y-2.5 text-[14px] text-white/70">
                  <li>
                    {isSignedIn ? (
                      <Link
                        href="/dashboard"
                        className="text-white hover:text-[#2F6BFF] font-medium transition-colors"
                      >
                        Dashboard
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="text-white hover:text-[#2F6BFF] font-medium transition-colors cursor-pointer"
                      >
                        Continue with Google
                      </button>
                    )}
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
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
                      <ExternalLink className="size-3" />
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-white/60">
            <div>
              © 2026 SignalRecall. Verifiable On-Chain Intelligence.
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
