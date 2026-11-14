"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCandles } from "@/lib/tatum";
import { cn } from "@/lib/utils";
import type { Candle, CoinSymbol, Direction } from "@/lib/types";

export type Timeframe = "1H" | "4H" | "1D" | "1W";

export interface CandlestickChartProps {
  symbol?: CoinSymbol;
  entryPrice?: number;
}

export interface ChartAnalysisData {
  symbol: CoinSymbol;
  timeframe: string;
  marketBias: "BULLISH MOMENTUM" | "BEARISH BREAKDOWN" | "RANGE CONSOLIDATION" | "OVERSOLD BOUNCE";
  direction: Direction;
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  invalidationPrice: number;
  riskRewardRatio: string;
  technicalSummary: {
    rsi: { value: number; interpretation: string };
    ema: { ema9: number; ema20: number; ema50: number; trend: string; alignment: string };
    macd: { macd: number; signal: number; histogram: number; signalCross: string };
    bollingerBands: { upper: number; middle: number; lower: number; status: string };
    levels: { majorSupport: number; majorResistance: number; swingLow: number; swingHigh: number };
    atr: number;
  };
  insights: string[];
  walrusMemoryCitation?: string | null;
}

export function CandlestickChart({ symbol = "BTC", entryPrice = 0 }: CandlestickChartProps) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("1D");
  const [loading, setLoading] = React.useState(true);
  const [noData, setNoData] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartInstanceRef = React.useRef<{ remove: () => void } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = React.useRef<any>(null);

  // AI Technical Chart Analysis State
  const [analyzing, setAnalyzing] = React.useState(false);
  const [analysis, setAnalysis] = React.useState<ChartAnalysisData | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [registeringSignal, setRegisteringSignal] = React.useState(false);
  const [signalSuccess, setSignalSuccess] = React.useState<{ id: string; blobId?: string } | null>(null);
  const [signalError, setSignalError] = React.useState<string | null>(null);

  const renderChart = React.useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;

    setLoading(true);
    const candles = await getCandles(symbol, timeframe);
    setLoading(false);
    setNoData(!candles || candles.length === 0);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const lc = await import("lightweight-charts");
    if (!containerRef.current) return;

    const initialWidth = containerRef.current.clientWidth || 600;
    const chart = lc.createChart(containerRef.current, {
      width: initialWidth,
      height: 360,
      layout: {
        background: { type: lc.ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.42)",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        rightOffset: 6,
      },
      crosshair: {
        vertLine: { color: "rgba(47,107,255,0.35)", width: 1, style: 2 },
        horzLine: { color: "rgba(47,107,255,0.35)", width: 1, style: 2 },
      },
    });

    const series = chart.addSeries(lc.CandlestickSeries, {
      upColor: "#19D49A",
      downColor: "#FF4D5E",
      borderUpColor: "#19D49A",
      borderDownColor: "#FF4D5E",
      wickUpColor: "#19D49A",
      wickDownColor: "#FF4D5E",
    });

    if (candles && candles.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      series.setData(candles as any);
      if (entryPrice > 0) {
        series.createPriceLine({
          price: entryPrice,
          color: "#2F6BFF",
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: "Signal Entry",
        });
      }
      chart.timeScale().fitContent();
    }

    chartInstanceRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          chart.applyOptions({ width: w });
        }
      }
    });
    ro.observe(containerRef.current);
  }, [symbol, timeframe, entryPrice]);

  React.useEffect(() => {
    renderChart();
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [renderChart]);

  // Live candle polling
  React.useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const fresh = await getCandles(symbol, timeframe);
        if (fresh && fresh.length > 0 && seriesRef.current) {
          seriesRef.current.setData(fresh);
        }
      } catch {
        // ignore background refresh error
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [symbol, timeframe]);

  // Execute AI Technical Chart Analysis
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setSignalSuccess(null);
    setSignalError(null);
    try {
      const res = await fetch("/api/ai/chart-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ChartAnalysisData;
      setAnalysis(data);
      setDrawerOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSignalError(msg);
      setDrawerOpen(true);
    } finally {
      setAnalyzing(false);
    }
  };

  // Turn analysis directly into a 24-hour verification signal
  const handleRegisterSignal = async () => {
    if (!analysis) return;
    setRegisteringSignal(true);
    setSignalError(null);
    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: analysis.symbol,
          direction: analysis.direction,
          target: analysis.targetPrice,
          invalidation: analysis.invalidationPrice,
          confidence: analysis.confidence,
          rationale: analysis.insights.join(" "),
          memoryGrounded: Boolean(analysis.walrusMemoryCitation),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to commit signal");
      }

      setSignalSuccess({
        id: data.signal?.id || "sig-new",
        blobId: data.signal?.blobId || data.memwal?.blobId || "walrus-verified",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSignalError(msg);
    } finally {
      setRegisteringSignal(false);
    }
  };

  const biasColor =
    analysis?.marketBias === "BULLISH MOMENTUM" || analysis?.marketBias === "OVERSOLD BOUNCE"
      ? "text-[#19D49A] bg-[#19D49A]/10 border-[#19D49A]/30"
      : analysis?.marketBias === "BEARISH BREAKDOWN"
      ? "text-[#FF4D5E] bg-[#FF4D5E]/10 border-[#FF4D5E]/30"
      : "text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/30";

  return (
    <GlassCard className="relative space-y-4">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">
            {symbol}/USDT
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-[#19D49A]/30 bg-[#19D49A]/10 text-[#19D49A] text-[10px] font-mono">
            <span className="size-1.5 rounded-full bg-[#19D49A] animate-pulse" />
            Live
          </span>
          {loading && <RefreshCw className="size-3 animate-spin text-electric ml-1" />}
        </div>

        <div className="flex items-center gap-2">
          {/* Analyze Chart with AI Button */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="glass-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/[0.12] transition-colors border border-electric/40"
          >
            {analyzing && <RefreshCw className="size-3.5 text-electric animate-spin" />}
            <span>{analyzing ? "Scanning Candles..." : "Analyze Chart with AI"}</span>
          </button>

          {/* Dropdown for Timeframe */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
              >
                <span>{timeframe}</span>
                <ChevronDown className="size-3 text-fg-2" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="rounded-2xl border border-white/10 bg-[#0B1024]/90 p-1 backdrop-blur-xl text-white"
            >
              {(["1H", "4H", "1D", "1W"] as const).map((tf) => (
                <DropdownMenuItem
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className="cursor-pointer rounded-xl px-3 py-1.5 text-xs text-white hover:bg-white/10"
                >
                  {tf}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* The Lightweight Chart Container */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[360px] relative overflow-hidden rounded-xl"
        />
        {noData && !loading && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-fg-2">
            Price feed unavailable, retrying
          </div>
        )}
      </div>

      {/* Instant Technical Intelligence Drawer */}
      {drawerOpen && (
        <div className="mt-4 rounded-2xl border border-white/15 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4.5 sm:p-5 backdrop-blur-xl space-y-4 animate-in fade-in-50 duration-200">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-white">
                AI Technical Chart Intelligence
              </h4>
              <p className="text-[11px] text-fg-2">
                Scanned {symbol} ({timeframe}) candles with RSI, MACD, EMAs &amp; Bollinger Bands
              </p>
            </div>

            {analysis && (
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide", biasColor)}>
                  {analysis.direction === "LONG" ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {analysis.marketBias} · {analysis.confidence}% Conf
                </span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-fg-3 hover:text-white text-xs px-2 py-1"
                >
                  Hide
                </button>
              </div>
            )}
          </div>

          {signalError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0 text-rose-400" />
                <span>{signalError}</span>
              </div>
            </div>
          )}

          {signalSuccess && (
            <div className="rounded-xl border border-[#19D49A]/30 bg-[#19D49A]/10 p-3.5 text-xs text-[#19D49A] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>
                  <strong>24h Signal Registered!</strong> Anchored into Walrus Memory Vault. 24h countdown active.
                </span>
              </div>
              <Link
                href="/signals"
                className="inline-flex items-center gap-1 text-white hover:underline font-medium text-[11px] rounded-lg bg-white/10 px-2.5 py-1"
              >
                View Ledger <ExternalLink className="size-3" />
              </Link>
            </div>
          )}

          {analysis && (
            <>
              {/* Technical Indicator Badges Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-[11px] text-white">
                  <span className="text-fg-3">RSI(14):</span>
                  <strong className={cn(
                    analysis.technicalSummary.rsi.value > 65 ? "text-amber-400" :
                    analysis.technicalSummary.rsi.value < 35 ? "text-emerald-400" : "text-white"
                  )}>
                    {analysis.technicalSummary.rsi.value}
                  </strong>
                  <span className="text-fg-3">({analysis.technicalSummary.rsi.interpretation})</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-[11px] text-white">
                  <span className="text-fg-3">Trend:</span>
                  <strong>{analysis.technicalSummary.ema.trend}</strong>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-[11px] text-white">
                  <span className="text-fg-3">MACD:</span>
                  <span className="text-white/90">{analysis.technicalSummary.macd.signalCross.replace("_", " ")}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-[11px] text-white">
                  <span className="text-fg-3">ATR Volatility:</span>
                  <span className="num">±${analysis.technicalSummary.atr.toLocaleString()}</span>
                </div>
              </div>

              {/* Key Price Levels Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left">
                  <div className="text-[10px] uppercase text-fg-3 font-semibold tracking-wider">
                    Pivot Entry (Tatum)
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-white num mt-0.5">
                    ${analysis.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-[#19D49A]/20 bg-[#19D49A]/[0.04] p-3 text-left">
                  <div className="text-[10px] uppercase text-[#19D49A] font-semibold tracking-wider">
                    Target Take-Profit
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-[#19D49A] num mt-0.5">
                    ${analysis.targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-[#FF4D5E]/20 bg-[#FF4D5E]/[0.04] p-3 text-left">
                  <div className="text-[10px] uppercase text-[#FF4D5E] font-semibold tracking-wider">
                    Invalidation Stop
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-[#FF4D5E] num mt-0.5">
                    ${analysis.invalidationPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left">
                  <div className="text-[10px] uppercase text-fg-3 font-semibold tracking-wider">
                    Risk / Reward
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-electric num mt-0.5">
                    {analysis.riskRewardRatio}
                  </div>
                </div>
              </div>

              {/* Insights Bullet Points */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                  Technical Price Action Breakdown:
                </div>
                <ul className="space-y-1 pl-1 text-xs text-white/90">
                  {analysis.insights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-electric shrink-0 leading-[18px] text-[10px] select-none">•</span>
                      <span className="leading-relaxed">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Walrus Memory Citation */}
              {analysis.walrusMemoryCitation && (
                <div className="flex items-center gap-2 rounded-xl bg-electric/10 border border-electric/25 px-3 py-2 text-xs text-electric">
                  <span>
                    <strong>Walrus Memory Citation:</strong> {analysis.walrusMemoryCitation}
                  </span>
                </div>
              )}

              {/* 1-Click Action Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div className="text-[11px] text-fg-3">
                  <span>24-Hour Settlement Ledger · Objective Verification via Tatum</span>
                </div>

                <button
                  type="button"
                  onClick={handleRegisterSignal}
                  disabled={registeringSignal || Boolean(signalSuccess)}
                  className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <span>
                    {registeringSignal
                      ? "Recording to Walrus..."
                      : signalSuccess
                      ? "Signal Committed"
                      : "Turn Into 24h Signal"}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
}
