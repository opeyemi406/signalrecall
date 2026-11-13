"use client";

import * as React from "react";
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownRight, KeyRound, RefreshCw, ExternalLink } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { LiquidHighlight } from "@/components/LiquidHighlight";
import { CoinIcon } from "@/components/CoinIcon";
import { Button } from "@/components/ui/button";
import { getMarketAssets, type TatumMarketResponse } from "@/lib/tatum";
import type { Asset, CoinSymbol } from "@/lib/types";
import { formatUsd, formatPct } from "@/lib/utils";
import type { MarketNewsItem } from "@/app/api/market/news/route";

export default function MarketsPage() {
  const [search, setSearch] = React.useState("");
  const [onlyGainers, setOnlyGainers] = React.useState(false);
  const [selected, setSelected] = React.useState<CoinSymbol>("ETH");
  const [marketData, setMarketData] = React.useState<TatumMarketResponse>({
    configured: true,
    provider: "tatum",
    assets: [],
  });
  const [news, setNews] = React.useState<MarketNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setNewsLoading(true);
    }
    try {
      const [mRes, nRes] = await Promise.all([
        getMarketAssets(),
        fetch("/api/market/news")
          .then((r) => r.json())
          .catch(() => ({ items: [] })),
      ]);
      setMarketData(mRes);
      if (Array.isArray(nRes.items)) {
        setNews(nRes.items);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
        setNewsLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    loadData();
    // Auto-refresh prices & news in background every 15 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filtered = marketData.assets.filter((a) => {
    const matchesSearch =
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !onlyGainers || a.change24h >= 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Market Intelligence
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            Real-time spot exchange rates via Tatum Data API
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={() => loadData(false)}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant={onlyGainers ? "primary" : "glass"}
            size="sm"
            onClick={() => setOnlyGainers((v) => !v)}
          >
            <SlidersHorizontal className="size-3.5" />
            <span>{onlyGainers ? "Showing Gainers" : "Filter"}</span>
          </Button>
        </div>
      </div>

      {!loading && !marketData.configured && (
        <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/10 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-[#F5A623]">
            <KeyRound className="size-5" />
            <h3 className="text-sm font-semibold">Tatum Data API Unconfigured</h3>
          </div>
          <p className="text-xs text-fg-2 leading-relaxed max-w-2xl">
            SignalRecall does not manufacture placeholder market values. To display live real-time prices for BTC, ETH, SOL, SUI, BNB, and XRP, configure your free Tatum API credentials.
          </p>
          <div className="bg-black/40 rounded-xl p-3 text-xs font-mono text-fg-2 border border-white/5 space-y-1">
            <div className="text-white"># Add to your .env file:</div>
            <div>TATUM_API_KEY=your_tatum_key_here</div>
            <div>TATUM_ENV=mainnet</div>
          </div>
        </div>
      )}

      {/* Full-width Glass List */}
      <GlassCard variant="tint" className="space-y-4">
        {/* Search Row */}
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter assets by ticker or name..."
            aria-label="Filter assets"
            className="glass-pill h-11 w-full rounded-full pl-4 pr-10 text-sm text-white placeholder:text-fg-3 outline-none focus:border-electric/60"
          />
          <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-fg-2" />
        </div>

        {/* Asset Rows */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-fg-3">
            {loading
              ? "Streaming live market rates..."
              : marketData.configured
              ? "No assets matching search filter."
              : "Awaiting Tatum API configuration to stream market data."}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((asset) => {
              const isSelected = asset.symbol === selected;
              const up = asset.change24h >= 0;

              return (
                <div key={asset.symbol}>
                  <LiquidHighlight
                    active={isSelected}
                    hoverable={!isSelected}
                    rounded="2xl"
                    onClick={() => setSelected(asset.symbol)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setSelected(asset.symbol);
                    }}
                    className="flex cursor-pointer items-center justify-between gap-3 px-3.5 sm:px-4 py-3"
                  >
                    {/* Coin + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <CoinIcon symbol={asset.symbol} size={36} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-fg-2 truncate">{asset.name}</div>
                      </div>
                    </div>

                    {/* Price and Delta */}
                    <div className="text-right num shrink-0">
                      <div
                        className={`text-sm font-semibold ${asset.unavailableReason ? "text-[#F5A623]" : "text-white"}`}
                      >
                        {asset.unavailableReason ? "Price unavailable" : formatUsd(asset.price)}
                      </div>
                      {asset.unavailableReason ? (
                        <div className="mt-0.5 max-w-[220px] text-[10px] leading-snug text-fg-3 whitespace-normal">
                          {asset.unavailableReason}
                        </div>
                      ) : (
                      <div
                        className={`mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium ${
                          up ? "text-[#19D49A]" : "text-[#FF4D5E]"
                        }`}
                      >
                        {up ? (
                          <ArrowUpRight className="size-3" />
                        ) : (
                          <ArrowDownRight className="size-3" />
                        )}
                        <span>{formatPct(asset.change24h)}</span>
                        <span className="text-[10px] text-fg-3 uppercase ml-1">Live</span>
                      </div>
                      )}
                    </div>
                  </LiquidHighlight>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Live Market News & Catalysts */}
      <GlassCard variant="default" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Live Market Wire &amp; Catalysts</h2>
          <span className="text-[11px] font-mono text-fg-3 uppercase tracking-wider">
            Powered by Finnhub API
          </span>
        </div>

        {newsLoading ? (
          <div className="py-8 text-center text-xs text-fg-3">Streaming market headlines...</div>
        ) : news.length === 0 ? (
          <div className="py-6 text-center text-xs text-fg-3">No live headlines available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {news.slice(0, 8).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-fg-3 mb-1.5">
                    <span className="font-semibold text-electric">{item.source}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <h3 className="text-xs font-medium text-white group-hover:text-electric transition-colors line-clamp-2 leading-relaxed">
                    {item.headline}
                  </h3>
                  {item.summary && (
                    <p className="text-[11px] text-fg-2 line-clamp-2 mt-1 leading-snug">
                      {item.summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-fg-3 group-hover:text-white pt-1">
                  <span>Read full story</span>
                  <ExternalLink className="size-2.5" />
                </div>
              </a>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
