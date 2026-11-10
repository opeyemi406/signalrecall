"use client";

import * as React from "react";
import { GlassCard } from "@/components/GlassCard";
import { LiquidHighlight } from "@/components/LiquidHighlight";
import { CoinIcon } from "@/components/CoinIcon";
import { getMarketAssets, type TatumMarketResponse } from "@/lib/tatum";
import type { Asset, CoinSymbol } from "@/lib/types";
import { formatUsd, formatPct } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, KeyRound, RefreshCw } from "lucide-react";

export function MarketOverviewCard() {
  const [selected, setSelected] = React.useState<CoinSymbol>("ETH");
  const [state, setState] = React.useState<TatumMarketResponse>({
    configured: false,
    provider: "tatum",
    assets: [],
  });
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    const res = await getMarketAssets();
    setState(res);
    if (!isBackground) setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
    // Auto-refresh prices in background every 15 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const displayAssets = state.assets;

  return (
    <GlassCard variant="tint" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-medium text-white">Market Overview</h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
              state.configured
                ? "bg-[#19D49A]/15 text-[#19D49A] border border-[#19D49A]/30"
                : "bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30"
            }`}
          >
            {state.configured ? "Tatum Live Feed" : "Tatum Unconfigured"}
          </span>
          <button
            onClick={() => loadData(false)}
            disabled={loading}
            aria-label="Refresh rates"
            className="text-fg-3 hover:text-white transition-colors"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!state.configured ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center space-y-2.5">
          <KeyRound className="size-6 text-[#F5A623] mx-auto" />
          <div className="text-sm font-semibold text-white">Tatum API Key Required</div>
          <p className="text-xs text-fg-2 max-w-sm mx-auto leading-relaxed">
            Live spot prices and 24h onchain outcome verification require a free Tatum API key.
            Add <code className="text-electric bg-white/[0.06] px-1 py-0.5 rounded">TATUM_API_KEY</code> to your{" "}
            <code className="text-electric bg-white/[0.06] px-1 py-0.5 rounded">.env</code> file.
          </p>
        </div>
      ) : displayAssets.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-xs text-fg-2">
          {loading ? "Fetching live market rates..." : "No asset rates returned from Tatum."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayAssets.map((asset) => {
            const isSelected = asset.symbol === selected;
            const up = asset.change24h >= 0;

            return (
              <LiquidHighlight
                key={asset.symbol}
                active={isSelected}
                hoverable={!isSelected}
                rounded="2xl"
                onClick={() => setSelected(asset.symbol)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(asset.symbol);
                }}
                className="flex cursor-pointer items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={asset.symbol} size={34} />
                  <div>
                    <div className="text-sm font-semibold text-white leading-tight">
                      {asset.symbol}
                    </div>
                    <div className="text-[11px] text-fg-2 leading-tight mt-0.5">
                      {asset.name}
                    </div>
                  </div>
                </div>

                <div className="text-right num">
                  <div
                    className={`text-sm font-semibold ${asset.unavailableReason ? "text-[#F5A623]" : "text-white"}`}
                    title={asset.unavailableReason}
                  >
                    {asset.unavailableReason ? "Price unavailable" : formatUsd(asset.price)}
                  </div>
                  {!asset.unavailableReason && (
                    <div
                      className={`mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium ${
                        up ? "text-[#19D49A]" : "text-[#FF4D5E]"
                      }`}
                    >
                      {up ? (
                        <ArrowUpRight className="size-3" />
                      ) : (
                        <ArrowDownRight className="size-3" />
                      )}
                      <span>{formatPct(asset.change24h)}</span>
                    </div>
                  )}
                </div>
              </LiquidHighlight>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
