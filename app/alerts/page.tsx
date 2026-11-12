"use client";

import * as React from "react";
import { Plus, Clock, Trash2, RefreshCw } from "lucide-react";
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
import { timeAgo } from "@/lib/time";

const ACCENT_COLORS: Record<AlertType, string> = {
  bullish: "#19D49A",
  whale: "#F5A623",
  resistance: "#F5A623",
  volume: "#FF4D5E",
  cross: "#E040FB",
};

export default function AlertsPage() {
  const [items, setItems] = React.useState<Alert[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const [newAsset, setNewAsset] = React.useState<CoinSymbol>("BTC");
  const [loading, setLoading] = React.useState(true);

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

  React.useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

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
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          asset: newAsset,
          type: "bullish",
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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white">
            Smart Alerts
          </h1>
          <p className="text-sm text-fg-2 mt-0.5">
            Real-time notifications for market structure breaks, volatility, and volume
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="glass"
            size="sm"
            onClick={loadAlerts}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
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
                Configure a condition to monitor on-chain price or volatility thresholds.
              </DialogDescription>

              <form onSubmit={handleAddAlert} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-2">Asset</label>
                  <select
                    value={newAsset}
                    onChange={(e) => setNewAsset(e.target.value as CoinSymbol)}
                    className="glass-pill h-10 w-full rounded-full px-4 text-xs text-white bg-black/40 border border-white/10 outline-none"
                  >
                    {SUPPORTED_COINS.map(
                      (sym) => (
                        <option key={sym} value={sym} className="bg-[#0B1024] text-white">
                          {sym}
                        </option>
                      )
                    )}
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
                  <Button type="submit" variant="primary" size="sm">
                    Save Alert
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
              Set up price thresholds, breakouts, or volume alerts to receive immediate notifications.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((alert) => {
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
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {alert.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-fg-2 mt-0.5">
                        <span className="font-semibold text-white/80">{alert.asset}</span>
                        <span className="inline-flex items-center gap-1 text-fg-3">
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
