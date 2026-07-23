"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import {
  Watch,
  RefreshCw,
  Link2,
  Unlink,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProviderMeta } from "@/lib/health/types";
import { HEALTH_CATEGORY_LABELS, type HealthMetricCategory } from "@/lib/health/types";
import { PhoneSensorPanel } from "@/components/health/phone-sensor-panel";

type Connection = {
  provider: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
};

type Prefs = Record<HealthMetricCategory, boolean>;

export default function GeraetePage() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [prefs, setPrefs] = useState<Partial<Prefs>>({});
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/wearables");
    const data = await res.json();
    setProviders(data.providers ?? []);
    setConnections(data.connections ?? []);
    if (data.preferences) setPrefs(data.preferences);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.success(`${connected} erfolgreich verbunden`);
    if (error) toast.error("Verbindung fehlgeschlagen");
  }, [searchParams]);

  async function connect(providerId: string) {
    const res = await fetch("/api/wearables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Verbindung fehlgeschlagen");
      return;
    }
    if (data.oauthUrl) {
      window.location.href = data.oauthUrl;
      return;
    }
    toast.success(
      data.nativeBridge
        ? "Gerät verbunden — Sync über mobile App / Health Connect"
        : "Gerät verbunden"
    );
    void load();
  }

  async function disconnect(providerId: string) {
    await fetch("/api/wearables/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId }),
    });
    toast.success("Gerät getrennt");
    void load();
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const res = await fetch("/api/wearables/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const total =
        (data.results ?? []).reduce(
          (s: number, r: { importedDays: number; importedWorkouts: number }) =>
            s + r.importedDays + r.importedWorkouts,
          0
        ) ?? 0;
      toast.success(
        total > 0 ? `${total} Datensätze synchronisiert` : "Synchronisation abgeschlossen"
      );
      void load();
    } catch {
      toast.error("Sync fehlgeschlagen");
    } finally {
      setSyncing(false);
    }
  }

  async function togglePref(key: HealthMetricCategory, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await fetch("/api/health/sync-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { [key]: value } }),
    });
  }

  const lastSync = connections
    .map((c) => c.lastSyncAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <PageShell
      title="Geräte"
      subtitle="Smartwatches & Fitness-Tracker verbinden"
      maxWidth="2xl"
      className="pb-28"
      bottomNav={false}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void syncAll()}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
          Sync
        </Button>
      }
    >
      {lastSync && (
        <p className="text-xs text-zinc-500 -mt-4">
          Letzte Synchronisation:{" "}
          {new Date(lastSync).toLocaleString("de-DE")}
        </p>
      )}

      <PremiumCard glow>
        <p className="text-sm text-zinc-400">
          Verbinde dein Gerät einmal — danach synchronisiert NEXFORM automatisch
          Schritte, Schlaf, Herzfrequenz und Workouts im Hintergrund.
        </p>
      </PremiumCard>

      <PhoneSensorPanel
        hasWearable={connections.some((c) => c.isActive)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((p) => {
          const conn = connections.find((c) => c.provider === p.id);
          const connected = conn?.isActive;
          return (
            <ProviderCard
              key={p.id}
              provider={p}
              connected={!!connected}
              lastSyncAt={conn?.lastSyncAt ?? null}
              lastSyncError={conn?.lastSyncError ?? null}
              onConnect={() => void connect(p.id)}
              onDisconnect={() => void disconnect(p.id)}
            />
          );
        })}
      </div>

      <PremiumCard>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-white">Datenschutz — Was synchronisieren?</h2>
        </div>
        <div className="space-y-2">
          {(Object.keys(HEALTH_CATEGORY_LABELS) as HealthMetricCategory[]).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-sm text-zinc-300">{HEALTH_CATEGORY_LABELS[key]}</span>
              <input
                type="checkbox"
                checked={prefs[key] !== false}
                onChange={(e) => void togglePref(key, e.target.checked)}
                className="h-5 w-5 rounded accent-[var(--accent)]"
              />
            </label>
          ))}
        </div>
      </PremiumCard>
    </PageShell>
  );
}

const ProviderCard = memo(function ProviderCard({
  provider,
  connected,
  lastSyncAt,
  lastSyncError,
  onConnect,
  onDisconnect,
}: {
  provider: ProviderMeta;
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <PremiumCard className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Watch className={cn("h-5 w-5", provider.color)} />
            <h3 className={cn("font-semibold", provider.color)}>{provider.name}</h3>
          </div>
          <p className="text-xs text-zinc-500 mt-1">{provider.description}</p>
          <p className="text-[10px] text-zinc-600 mt-1">{provider.apiNote}</p>
        </div>
        {connected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        ) : null}
      </div>

      {lastSyncError && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {lastSyncError}
        </p>
      )}

      {lastSyncAt && (
        <p className="text-[10px] text-zinc-600">
          Sync: {new Date(lastSyncAt).toLocaleString("de-DE")}
        </p>
      )}

      <Button
        variant={connected ? "secondary" : "premium"}
        className="w-full mt-auto"
        onClick={connected ? onDisconnect : onConnect}
      >
        {connected ? (
          <>
            <Unlink className="h-4 w-4 mr-1" /> Trennen
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4 mr-1" /> Verbinden
          </>
        )}
      </Button>
    </PremiumCard>
  );
});
