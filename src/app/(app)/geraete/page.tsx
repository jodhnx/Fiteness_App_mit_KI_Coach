"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  Battery,
  BatteryLow,
  Clock,
  Smartphone,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ProviderMeta } from "@/lib/health/types";
import { HEALTH_CATEGORY_LABELS, type HealthMetricCategory } from "@/lib/health/types";
import { PhoneSensorPanel } from "@/components/health/phone-sensor-panel";
import { PageIntro } from "@/components/guide/page-intro";

type Connection = {
  provider: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  connectedAt?: string | null;
  deviceName?: string;
  manufacturer?: string;
  batteryLevel?: number | null;
  syncStatus?: string;
};

type Prefs = Record<HealthMetricCategory, boolean>;

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function syncLabel(status?: string, error?: string | null) {
  if (error) return "Fehler";
  switch (status) {
    case "oauth_pending":
      return "OAuth ausstehend";
    case "native_bridge":
      return "Native Bridge bereit";
    case "error":
      return "Fehler";
    default:
      return "Verbunden";
  }
}

export default function GeraetePage() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [prefs, setPrefs] = useState<Partial<Prefs>>({});
  const [syncing, setSyncing] = useState<string | null>(null);

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
    if (connected) toast.success(`${connected.replace(/_/g, " ")} verbunden`);
    if (error) toast.error("Verbindung fehlgeschlagen");
  }, [searchParams]);

  const activeConnections = useMemo(
    () => connections.filter((c) => c.isActive),
    [connections]
  );
  const hasWearable = activeConnections.length > 0;

  const lastSync = activeConnections
    .map((c) => c.lastSyncAt)
    .filter(Boolean)
    .sort()
    .pop();

  async function connect(providerId: string) {
    const res = await fetch("/api/wearables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error ?? "Verbindung fehlgeschlagen");
      return;
    }
    if (data.oauthUrl) {
      window.location.href = data.oauthUrl;
      return;
    }
    toast.success(
      data.nativeBridge
        ? "Verbunden — Sync über HealthKit / Health Connect"
        : "Gerät verbunden"
    );
    void load();
  }

  async function disconnect(providerId: string) {
    const res = await fetch("/api/wearables/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data?.error ?? "Trennen fehlgeschlagen");
      return;
    }
    toast.success("Gerät getrennt");
    void load();
  }

  async function syncOne(providerId?: string) {
    setSyncing(providerId ?? "all");
    try {
      const res = await fetch("/api/wearables/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerId ? { provider: providerId } : {}),
      });
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
      setSyncing(null);
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

  return (
    <PageShell
      title="Geräte & Gesundheit"
      subtitle="Smartwatches, Health-Apps & Smartphone"
      maxWidth="2xl"
      className="pb-28"
      bottomNav={false}
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void syncOne()}
          disabled={syncing !== null || !hasWearable}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", syncing === "all" && "animate-spin")} />
          Sync
        </Button>
      }
    >
      <Link
        href="/settings"
        prefetch
        className="inline-flex items-center gap-1 text-sm font-medium text-accent active:opacity-80 -mt-2 -ml-1 py-1 w-fit"
      >
        <ChevronLeft className="h-5 w-5" />
        Einstellungen
      </Link>

      <PageIntro pageId="geraete" />

      {lastSync && (
        <p className="text-xs text-zinc-500 -mt-4">
          Letzte Synchronisation: {formatDate(lastSync)}
        </p>
      )}

      <PremiumCard glow>
        <p className="text-sm text-zinc-300">
          Verbinde Apple Health, Health Connect, Fitbit, Garmin und mehr.
          Ohne Smartwatch nutzt NEXFORM automatisch dein Smartphone — nach deiner Zustimmung.
        </p>
      </PremiumCard>

      {/* Connected devices management */}
      {activeConnections.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em] px-0.5">
            Verbundene Geräte
          </h2>
          {activeConnections.map((conn) => {
            const meta = providers.find((p) => p.id === conn.provider);
            return (
              <ConnectedDeviceCard
                key={conn.provider}
                connection={conn}
                color={meta?.color ?? "text-accent"}
                syncing={syncing === conn.provider}
                onSync={() => void syncOne(conn.provider)}
                onDisconnect={() => void disconnect(conn.provider)}
              />
            );
          })}
        </section>
      )}

      {/* Phone fallback — always available, highlighted when no watch */}
      <section className="space-y-2">
        {!hasWearable && (
          <div className="flex items-center gap-2 text-xs text-accent px-0.5">
            <Smartphone className="h-3.5 w-3.5" />
            Keine Smartwatch — Smartphone als Sensor empfohlen
          </div>
        )}
        <PhoneSensorPanel hasWearable={hasWearable} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em] px-0.5">
          Plattformen verbinden
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => {
            const conn = connections.find((c) => c.provider === p.id && c.isActive);
            return (
              <ProviderCard
                key={p.id}
                provider={p}
                connected={!!conn}
                lastSyncAt={conn?.lastSyncAt ?? null}
                lastSyncError={conn?.lastSyncError ?? null}
                onConnect={() => void connect(p.id)}
                onDisconnect={() => void disconnect(p.id)}
              />
            );
          })}
        </div>
      </section>

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

const ConnectedDeviceCard = memo(function ConnectedDeviceCard({
  connection,
  color,
  syncing,
  onSync,
  onDisconnect,
}: {
  connection: Connection;
  color: string;
  syncing: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const BatteryIcon =
    connection.batteryLevel != null && connection.batteryLevel < 20
      ? BatteryLow
      : Battery;

  return (
    <PremiumCard className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Watch className={cn("h-5 w-5 shrink-0", color)} />
            <h3 className="font-semibold text-white truncate">
              {connection.deviceName ?? connection.provider}
            </h3>
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {connection.manufacturer ?? "—"}
          </p>
        </div>
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-1 rounded-full shrink-0",
            connection.lastSyncError
              ? "bg-amber-500/15 text-amber-300"
              : "bg-emerald-500/15 text-emerald-300"
          )}
        >
          {syncLabel(connection.syncStatus, connection.lastSyncError)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-zinc-600 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Letzte Sync
          </dt>
          <dd className="text-zinc-300 mt-0.5">{formatDate(connection.lastSyncAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-600">Verbunden seit</dt>
          <dd className="text-zinc-300 mt-0.5">{formatDate(connection.connectedAt)}</dd>
        </div>
        {connection.batteryLevel != null && (
          <div className="col-span-2">
            <dt className="text-zinc-600 flex items-center gap-1">
              <BatteryIcon className="h-3 w-3" /> Akkustand
            </dt>
            <dd className="text-zinc-300 mt-0.5">{connection.batteryLevel}%</dd>
          </div>
        )}
      </dl>

      {connection.lastSyncError && (
        <p className="text-xs text-amber-400 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {connection.lastSyncError}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="premium"
          size="sm"
          className="flex-1"
          disabled={syncing}
          onClick={onSync}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", syncing && "animate-spin")} />
          Neu synchronisieren
        </Button>
        <Button variant="secondary" size="sm" onClick={onDisconnect}>
          <Unlink className="h-4 w-4 mr-1" />
          Trennen
        </Button>
      </div>
    </PremiumCard>
  );
});

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
          <p className="text-[10px] text-zinc-600 mt-0.5">{provider.manufacturer}</p>
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
        <p className="text-[10px] text-zinc-600">Sync: {formatDate(lastSyncAt)}</p>
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
