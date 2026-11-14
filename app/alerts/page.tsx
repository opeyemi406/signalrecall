"use client";

import * as React from "react";
import { Plus, Clock, Trash2, RefreshCw, ExternalLink, BellPlus } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { CoinIcon } from "@/components/CoinIcon";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SUPPORTED_COINS, type Alert, type AlertType, type CoinSymbol } from "@/lib/types";
import { SearchContext } from "@/components/layout/AppShell";
import { timeAgo } from "@/lib/time";
import type { LiveCatalyst } from "@/lib/server/catalysts";

const ACCENT_COLORS: Record<AlertType, string> = {
  bullish: "#19D49A",
  whale: "#F5A623",
  resistance: "#F5A623",
  volume: "#FF4D5E",
  cross: "#E040FB",
};

function ImpactBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-medium text-fg-3 num">
        Unscored
      </span>
    );
  }
  const color =
    score >= 75
      ? "bg-[#FF4D5E]/15 border-[#FF4D5E]/30 text-[#FF4D5E]"
      : score >= 50
      ? "bg-[#F5A623]/15 border-[#F5A623]/30 text-[#F5A623]"
      : "bg-[#19D49A]/15 border-[#19D49A]/30 text-[#19D49A]";

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold num ${color}`}>
      Impact {score}/100
    </span>
  );
}

export default function AlertsPage() {
  const [items, setItems] = React.useState<Alert[]>([]);
  const [catalysts, setCatalysts] = React.useState<LiveCatalyst[]>([]);
  const [catalystsError, setCatalystsError] = React.useState<string | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newAsset, setNewAsset] = React.useState<CoinSymbol>("BTC");
  const [saving, setSaving] = React.useState(false);
  const [trackingId, setTrackingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [catalystsLoading, setCatalystsLoading] = React.useState(true);

  const loadAlerts = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      setItems(data.alerts || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalysts = React.useCallback(async () => {
    setCatalystsLoading(true);
    setCatalystsError(null);
    try {
      const res = await fetch("/api/alerts/catalysts");
      const data = await res.json();
      setCatalysts(data.catalysts || []);
      if (data.error) {
        setCatalystsError(data.error);
      }
    } catch {
      setCatalystsError("Failed to fetch live catalysts.");
    } finally {
      setCatalystsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAlerts();
    loadCatalysts();
  }, [loadAlerts, loadCatalysts]);

  const toggleAlert = async (id: string) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
        );
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || saving) return;

    setSaving(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          asset: newAsset,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [data.alert, ...prev]);
        setNewTitle("");
        setModalOpen(false);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleTrackCatalyst = async (c: LiveCatalyst) => {
    setTrackingId(c.id);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: c.title,
          asset: c.asset,
          type: c.type,
          impactScore: c.impactScore,
          impactNote: c.impactNote,
          isAISignal: true,
          url: c.url,
          catalystKind: c.kind,
          scheduledFor: c.kind === "upcoming" ? c.timestamp : undefined,
          walrusMemoryMatch: c.walrusMemoryMatch,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [data.alert, ...prev]);
      }
    } finally {
      setTrackingId(null);
    }
  };

  const trackedTitles = React.useMemo(
    () => new Set(items.map((a) => a.title.toLowerCase())),
    [items]
  );

  const { query: globalQuery } = React.useContext(SearchContext);
  const q = globalQuery.trim().toLowerCase();
  const visibleCatalysts = q
    ? catalysts.filter((c) =>
        `${c.title} ${c.summary} ${c.asset} ${c.source} ${c.type} ${c.impactNote || ""}`
          .toLowerCase()
          .includes(q)
      )
    : catalysts;
  const visibleItems = q
    ? items.filter((a) =>
        `${a.title} ${a.asset} ${a.type} ${a.impactNote || ""}`
          .toLowerCase()
          .includes(q)
      )
    : items;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Smart Alerts
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            Live upcoming &amp; recent catalysts scored against Walrus Memory and market volatility
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              loadAlerts();
              loadCatalysts();
            }}
            disabled={loading || catalystsLoading}
          >
            <RefreshCw className={`size-3.5 ${loading || catalystsLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="size-3.5" />
                <span>Create Alert</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="border border-white/10 bg-[#0B1024]/95 backdrop-blur-2xl text-white">
              <DialogTitle className="text-lg font-semibold text-white">
                New Price &amp; Catalyst Alert
              </DialogTitle>
              <DialogDescription className="text-xs text-fg-2">
                Your alert is evaluated against live market telemetry and recalled Walrus memories to compute a real historical impact score.
              </DialogDescription>

              <form onSubmit={handleAddAlert} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Asset</label>
                  <select
                    value={newAsset}
                    onChange={(e) => setNewAsset(e.target.value as CoinSymbol)}
                    className="glass-pill h-10 w-full rounded-full px-4 text-xs text-white bg-black/40 border border-white/10 outline-none"
                  >
                    {SUPPORTED_COINS.map((sym) => (
                      <option key={sym} value={sym} className="bg-[#0B1024] text-white">
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Condition Title</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. BTC breakout above $68,000"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? "Scoring Impact..." : "Save Alert"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Live Upcoming & Recent Catalysts with Historical Impact Scores */}
      <GlassCard variant="default" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-[16px] font-medium text-white">
              Live Catalysts &amp; Historical Impact ({catalysts.length})
            </h3>
            <p className="text-xs text-fg-3 mt-0.5">
              Real-time market &amp; macro catalysts scored with your Walrus Memory history
            </p>
          </div>
        </div>

        {catalystsLoading ? (
          <div className="py-10 text-center text-xs text-fg-3">
            Fetching live catalysts and scoring historical impact against Walrus Memory...
          </div>
        ) : catalysts.length === 0 ? (
          <div className="py-10 text-center text-xs text-fg-3 space-y-1">
            <p className="text-white font-medium">No live catalysts available</p>
            {catalystsError && <p className="text-fg-2">{catalystsError}</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleCatalysts.map((c) => {
              const barColor = ACCENT_COLORS[c.type] || "#19D49A";
              const alreadyTracked = trackedTitles.has(c.title.toLowerCase());
              const isTracking = trackingId === c.id;

              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-1.5 h-5 rounded-full shrink-0"
                          style={{ backgroundColor: barColor }}
                        />
                        <CoinIcon symbol={c.asset} size={22} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-2">
                          {c.kind === "upcoming" ? "Upcoming" : "Recent"} · {c.asset}
                        </span>
                      </div>
                      <ImpactBadge score={c.impactScore} />
                    </div>

                    <div className="text-sm font-semibold text-white leading-snug">
                      {c.title}
                    </div>

                    <p className="text-xs text-fg-2 leading-relaxed">
                      {c.impactNote}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px] text-fg-3">
                    <div className="flex items-center gap-2 truncate">
                      <span>{c.source}</span>
                      <span>·</span>
                      <span>{timeAgo(c.timestamp)}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.url && (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-fg-2 hover:text-white"
                        >
                          <span>Source</span>
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      <Button
                        variant="glass"
                        size="sm"
                        disabled={alreadyTracked || isTracking}
                        onClick={() => handleTrackCatalyst(c)}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        <BellPlus className="size-3" />
                        <span>{alreadyTracked ? "Tracked" : isTracking ? "Saving..." : "Track"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Main Glass Alert Card */}
      <GlassCard variant="tint" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-medium text-white">
            Active Alerts ({items.length})
          </h3>
        </div>

        {items.length === 0 ? (
          <div className="py-14 text-center text-xs text-fg-3 space-y-2">
            <p className="text-white font-medium">No alerts created yet</p>
            <p className="text-fg-2 max-w-sm mx-auto">
              Create a custom alert or track a live catalyst above to monitor historical impact and price triggers.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((alert) => {
              const barColor = ACCENT_COLORS[alert.type] || "#19D49A";

              return (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-1.5 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: barColor }}
                    />
                    <CoinIcon symbol={alert.asset} size={32} />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {alert.title}
                        </span>
                        <ImpactBadge score={alert.impactScore} />
                      </div>
                      {alert.impactNote && (
                        <div className="text-xs text-fg-2 leading-snug">
                          {alert.impactNote}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-fg-3">
                        <span className="font-semibold text-white/80">{alert.asset}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {timeAgo(alert.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={alert.enabled}
                      onCheckedChange={() => toggleAlert(alert.id)}
                      aria-label="Toggle alert"
                    />
                    <button
                      type="button"
                      onClick={() => handleDelete(alert.id)}
                      className="text-fg-3 hover:text-[#FF4D5E] p-1 transition-colors"
                      aria-label="Delete alert"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
