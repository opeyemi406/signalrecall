"use client";

import * as React from "react";
import { ChevronDown, Calendar, RefreshCw } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCandles } from "@/lib/tatum";
import type { Candle, CoinSymbol } from "@/lib/types";

export type Timeframe = "1H" | "4H" | "1D" | "1W";

export interface CandlestickChartProps {
  symbol?: CoinSymbol;
  entryPrice?: number;
}

export function CandlestickChart({ symbol = "BTC", entryPrice = 0 }: CandlestickChartProps) {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("1D");
  const [loading, setLoading] = React.useState(true);
  const [noData, setNoData] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartInstanceRef = React.useRef<{ remove: () => void } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = React.useRef<any>(null);

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

  // Live real-time candle ticking every 15 seconds
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

        {/* Dropdown for Timeframe */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
            >
              <Calendar className="size-3.5 text-fg-2" />
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

      {/* The Lightweight Chart Container */}
      <div className="relative">
        <div
          ref={containerRef}
          className="w-full h-[360px] relative overflow-hidden rounded-xl"
        />
        {noData && !loading && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-fg-2">
            Chart data unavailable for {symbol}. The candle provider has no market for this token.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
