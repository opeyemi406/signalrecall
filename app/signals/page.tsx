"use client";

import * as React from "react";
import { Clock, CheckCircle2, ChevronDown, ChevronUp, KeyRound, RefreshCw, Send } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { DeltaChip } from "@/components/DeltaChip";
import { CoinIcon } from "@/components/CoinIcon";
import { CandlestickChart } from "@/components/cards/CandlestickChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifySignal } from "@/lib/tatum";
import { timeAgo, shortDate } from "@/lib/time";
import { formatUsd } from "@/lib/utils";
import { SUPPORTED_COINS, type CoinSymbol, type Direction, type Signal } from "@/lib/types";

export default function SignalsPage() {
  const [side, setSide] = React.useState<Direction>("LONG");
  const [selectedAsset, setSelectedAsset] = React.useState<CoinSymbol>("BTC");
  const [currentSpotPrice, setCurrentSpotPrice] = React.useState<number | null>(null);
  const [priceUnavailable, setPriceUnavailable] = React.useState<string | null>(null);
  const [tatumConfigured, setTatumConfigured] = React.useState<boolean>(true);
  const [targetPrice, setTargetPrice] = React.useState("");
  const [invalidationPrice, setInvalidationPrice] = React.useState("");
  const [rationale, setRationale] = React.useState("");
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<{ text: string; type: "error" | "success" } | null>(null);

  const fetchSignalsAndMarket = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sigRes, priceRes] = await Promise.all([
        fetch("/api/signals"),
        fetch("/api/market/prices"),
      ]);
      const sigData = await sigRes.json();
      setSignals(sigData.signals || []);
      setTatumConfigured(sigData.configured !== false);

      const priceData = await priceRes.json();
      const btc = priceData.assets?.find((a: { symbol: string }) => a.symbol === selectedAsset);
      if (btc?.unavailableReason) {
        setCurrentSpotPrice(null);
        setPriceUnavailable(btc.unavailableReason);
      } else if (btc) {
        setPriceUnavailable(null);
        setCurrentSpotPrice(btc.price);
        setTargetPrice((prev) =>
          prev || String(side === "LONG" ? +(btc.price * 1.05).toFixed(2) : +(btc.price * 0.95).toFixed(2))
        );
        setInvalidationPrice((prev) =>
          prev || String(side === "LONG" ? +(btc.price * 0.97).toFixed(2) : +(btc.price * 1.03).toFixed(2))
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedAsset, side]);

  // Reset price-derived fields when switching assets so stale levels are never submitted.
  React.useEffect(() => {
    setTargetPrice("");
    setInvalidationPrice("");
    setCurrentSpotPrice(null);
    setPriceUnavailable(null);
  }, [selectedAsset]);

  React.useEffect(() => {
    fetchSignalsAndMarket();
  }, [fetchSignalsAndMarket]);

  const handleCreateSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tatumConfigured) {
      setMessage({
        text: "TATUM_API_KEY is required in .env to capture live entry price and schedule 24h verification.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: selectedAsset,
          direction: side,
          target: targetPrice ? parseFloat(targetPrice) : undefined,
          invalidation: invalidationPrice ? parseFloat(invalidationPrice) : undefined,
          rationale: rationale.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || "Failed to create signal", type: "error" });
      } else {
        setMessage({
          text: `Signal recorded at live entry price $${data.signal.entry.toLocaleString()}. Anchored to Walrus blob: ${data.walrusBlobId || "local"}`,
          type: "success",
        });
        setSignals((prev) => [data.signal, ...prev]);
        setRationale("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ text: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (sig: Signal) => {
    setVerifyingId(sig.id);
    setMessage(null);
    try {
      const res = await verifySignal(sig, true); // force=true allows instant progress testing
      if (res.verified) {
        setMessage({
          text: `Objective 24h check complete: Settled price $${res.settledPrice?.toLocaleString()} -> ${res.status} (${res.pnlPct}% PnL)`,
          type: "success",
        });
        // refresh signals
        const updatedRes = await fetch("/api/signals");
        const updatedData = await updatedRes.json();
        setSignals(updatedData.signals || []);
      } else {
        setMessage({ text: res.message || "Verification check failed.", type: "error" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ text: msg, type: "error" });
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Trading Terminal
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2.5 text-sm text-fg-2 num">
            <span>
              {selectedAsset} / USD —{" "}
              {currentSpotPrice ? formatUsd(currentSpotPrice) : priceUnavailable ? "Price unavailable" : "Price streaming via Tatum"}
            </span>
            <DeltaChip
              label={tatumConfigured ? "Tatum Live" : "Awaiting Tatum Key"}
              positive={tatumConfigured}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value as CoinSymbol)}
          aria-label="Asset"
          className="glass-pill h-9 rounded-full px-4 text-xs text-white bg-black/40 border border-white/10 outline-none"
        >
          {SUPPORTED_COINS.map((sym) => (
            <option key={sym} value={sym} className="bg-[#0B1024] text-white">
              {sym}
            </option>
          ))}
        </select>
        <Button
          variant="glass"
          size="sm"
          onClick={fetchSignalsAndMarket}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
        </div>
      </div>

      {priceUnavailable && (
        <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/10 p-4 text-xs text-fg-2 leading-relaxed">
          <span className="font-semibold text-[#F5A623]">{selectedAsset} live price unavailable.</span> {priceUnavailable} Signals need a real entry price, so recording is disabled for this asset.
        </div>
      )}

      {!loading && !tatumConfigured && (
        <div className="rounded-2xl border border-[#F5A623]/30 bg-[#F5A623]/10 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-[#F5A623] font-semibold">
            <KeyRound className="size-4" />
            <span>Tatum API Key Required For Live Signals</span>
          </div>
          <p className="text-fg-2 leading-relaxed">
            SignalRecall does not generate signals from placeholder prices or pretend mock data is live.
            Configure <code className="text-electric bg-white/[0.06] px-1 py-0.5 rounded">TATUM_API_KEY</code> in your{" "}
            <code className="text-electric bg-white/[0.06] px-1 py-0.5 rounded">.env</code> to capture onchain entry prices and schedule genuine 24h verifications.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`rounded-2xl p-4 text-xs font-medium border ${
            message.type === "success"
              ? "bg-[#19D49A]/10 border-[#19D49A]/30 text-[#19D49A]"
              : "bg-[#FF4D5E]/10 border-[#FF4D5E]/30 text-[#FF4D5E]"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Top Glass Card: BUY/SELL Toggle + Inputs */}
      <GlassCard className="space-y-5">
        <form onSubmit={handleCreateSignal} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* BUY / SELL Segmented Pill */}
            <div className="inline-flex max-w-full items-center rounded-full bg-white/[0.04] border border-white/10 p-1">
              {(["LONG", "SHORT"] as const).map((mode) => {
                const active = side === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSide(mode)}
                    className={`rounded-full px-4 sm:px-6 py-1.5 text-xs font-semibold tracking-wide transition-all whitespace-nowrap ${
                      active
                        ? "bg-white text-ink shadow-[0_4px_18px_rgba(255,255,255,0.25)]"
                        : "text-fg-2 hover:text-white"
                    }`}
                  >
                    {mode === "LONG" ? "BUY / LONG" : "SELL / SHORT"}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-fg-2">
              Horizon: <span className="text-white font-semibold">24h Settlement</span>
            </div>
          </div>

          {/* Row of Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-fg-2">
                Target Price (USD)
              </label>
              <Input
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={currentSpotPrice ? String(currentSpotPrice * 1.05) : "Target"}
                aria-label="Target price in USD"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-fg-2">
                Stop Loss / Invalidation (USD)
              </label>
              <Input
                value={invalidationPrice}
                onChange={(e) => setInvalidationPrice(e.target.value)}
                placeholder={currentSpotPrice ? String(currentSpotPrice * 0.97) : "Stop"}
                aria-label="Stop loss in USD"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-fg-2">
                Rationale / Thesis
              </label>
              <Input
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Catalyst, chart pattern, or onchain note"
                aria-label="Thesis"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !tatumConfigured || Boolean(priceUnavailable)}
            >
              <Send className="size-3.5" />
              <span>{submitting ? "Anchoring to Walrus..." : "Record Live 24h Signal"}</span>
            </Button>
          </div>
        </form>
      </GlassCard>

      {/* Live Candlestick Chart */}
      <CandlestickChart
        symbol={selectedAsset}
        entryPrice={currentSpotPrice ?? 0}
      />

      {/* Signals Ledger */}
      <GlassCard variant="tint" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[16px] font-medium text-white">
              Signal Registry ({signals.length})
            </h3>
            <p className="text-xs text-fg-2 mt-0.5">
              Every signal anchors an exact entry price and verifies against onchain Tatum price 24h later
            </p>
          </div>
        </div>

        {signals.length === 0 ? (
          <div className="py-12 text-center text-xs text-fg-3 space-y-2">
            <p>No trading signals recorded yet.</p>
            <p className="text-fg-2 max-w-sm mx-auto">
              Use the terminal above to record a live call. Signals persist to local ledger and are verified objectively after 24 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map((sig) => {
              const isExpanded = expandedId === sig.id;
              const isPending = sig.status === "IN_PROGRESS";
              const isVerifying = verifyingId === sig.id;

              return (
                <div
                  key={sig.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CoinIcon symbol={sig.asset} size={36} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {sig.asset} {sig.direction}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              sig.status === "TARGET_REACHED"
                                ? "bg-[#19D49A]/15 text-[#19D49A] border border-[#19D49A]/30"
                                : sig.status === "INVALIDATED"
                                ? "bg-[#FF4D5E]/15 text-[#FF4D5E] border border-[#FF4D5E]/30"
                                : "bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30"
                            }`}
                          >
                            {sig.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="text-xs text-fg-2 num mt-0.5 break-words">
                          Entry: ${sig.entry.toLocaleString()} · Target: ${sig.target.toLocaleString()} · Stop: ${sig.invalidation.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Button
                          variant="glass"
                          size="sm"
                          disabled={isVerifying || !tatumConfigured}
                          onClick={() => handleVerify(sig)}
                        >
                          <CheckCircle2 className="size-3.5 text-electric" />
                          <span>{isVerifying ? "Verifying..." : "Check 24h Status"}</span>
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : sig.id)}
                        className="text-fg-3 hover:text-white p-1"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                      <div className="text-fg-2">{sig.rationale}</div>
                      <div className="flex flex-wrap items-center gap-3 text-fg-3 num">
                        <span>Created: {shortDate(sig.createdAt)}</span>
                        <span>Verify At: {shortDate(sig.verifyAt)} ({timeAgo(sig.verifyAt)})</span>
                      </div>
                      {sig.memoryAudit?.summary && (
                        <div className="inline-flex items-center gap-1.5 text-fg-3 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                          <span>{sig.memoryAudit.summary}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
