"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PremiumCard } from "@/components/ui/premium-card";
import { Button } from "@/components/ui/button";
import {
  Footprints,
  Moon,
  Heart,
  Flame,
  Droplets,
  Scale,
  Battery,
  Activity,
  Watch,
  RefreshCw,
} from "lucide-react";
import type { ExtendedHealthDashboard } from "@/lib/health/health-dashboard";
import { cn } from "@/lib/utils";

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-accent",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <PremiumCard padding="sm" className="min-h-[88px] flex flex-col justify-between">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
    </PremiumCard>
  );
}

export default function GesundheitPage() {
  const [data, setData] = useState<ExtendedHealthDashboard | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/health/dashboard");
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/wearables/sync", { method: "POST" }).then(() => load());
  }, [load]);

  async function syncNow() {
    setSyncing(true);
    await fetch("/api/wearables/sync", { method: "POST" });
    await load();
    setSyncing(false);
  }

  const t = data?.today;

  return (
    <PageShell
      title="Gesundheit"
      subtitle="Dein Health Dashboard"
      maxWidth="2xl"
      className="pb-28 space-y-4"
      bottomNav={false}
      action={
        <Button variant="secondary" size="sm" onClick={() => void syncNow()} disabled={syncing}>
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
        </Button>
      }
    >
      {data?.lastSyncAt && (
        <p className="text-xs text-zinc-500 -mt-4">
          Zuletzt synchronisiert: {new Date(data.lastSyncAt).toLocaleString("de-DE")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={Footprints}
          label="Schritte"
          value={t?.steps.toLocaleString("de-DE") ?? "—"}
          sub={t ? `${Math.round((t.steps / t.stepGoal) * 100)}% vom Ziel` : undefined}
        />
        <MetricTile
          icon={Moon}
          label="Schlaf"
          value={t?.sleepHours != null ? `${t.sleepHours.toFixed(1)} h` : "—"}
          sub={data?.sleepLastNight.quality ?? "Letzte Nacht"}
          color="text-indigo-400"
        />
        <MetricTile
          icon={Heart}
          label="Ruhepuls"
          value={t?.restingHeartRate != null ? `${t.restingHeartRate} bpm` : "—"}
          sub={t?.avgHeartRate ? `Ø ${t.avgHeartRate} bpm` : undefined}
          color="text-rose-400"
        />
        <MetricTile
          icon={Flame}
          label="Kalorien"
          value={t?.caloriesBurned != null ? `${t.caloriesBurned} kcal` : "—"}
          sub={
            t?.activeCalories != null ? `${t.activeCalories} aktiv` : "Verbrauch heute"
          }
          color="text-orange-400"
        />
        <MetricTile
          icon={Droplets}
          label="Wasser"
          value={`${Math.round((t?.waterMl ?? 0) / 100) / 10} L`}
          sub={`Ziel ${Math.round((t?.waterGoalMl ?? 2500) / 100) / 10} L`}
          color="text-cyan-400"
        />
        <MetricTile
          icon={Scale}
          label="Gewicht"
          value={t?.weightKg != null ? `${t.weightKg.toFixed(1)} kg` : "—"}
          sub={t?.bmi != null ? `BMI ${t.bmi.toFixed(1)}` : undefined}
        />
        <MetricTile
          icon={Battery}
          label="Regeneration"
          value={data?.regeneration.label ?? "—"}
          sub={
            data?.regeneration.score != null
              ? `${data.regeneration.score}% Score`
              : undefined
          }
          color="text-emerald-400"
        />
        <MetricTile
          icon={Activity}
          label="Bereitschaft"
          value={data?.regeneration.readinessLabel ?? "—"}
          sub={
            data?.regeneration.trainingReadiness != null
              ? `${data.regeneration.trainingReadiness}%`
              : "Training"
          }
          color="text-violet-400"
        />
      </div>

      {data?.connections && data.connections.filter((c) => c.isActive).length > 0 && (
        <PremiumCard>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Watch className="h-4 w-4 text-accent" /> Verbundene Geräte
          </h2>
          <ul className="space-y-2">
            {data.connections
              .filter((c) => c.isActive)
              .map((c) => (
                <li
                  key={c.provider}
                  className="flex justify-between text-sm text-zinc-400"
                >
                  <span>{c.name}</span>
                  <span className="text-zinc-600 text-xs">
                    {c.lastSyncAt
                      ? new Date(c.lastSyncAt).toLocaleString("de-DE")
                      : "—"}
                  </span>
                </li>
              ))}
          </ul>
        </PremiumCard>
      )}

      <Link href="/geraete">
        <Button variant="outline" className="w-full">
          <Watch className="h-4 w-4 mr-2" />
          Geräte verwalten
        </Button>
      </Link>
    </PageShell>
  );
}
