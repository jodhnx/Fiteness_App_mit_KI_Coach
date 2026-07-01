"use client";

import { memo } from "react";
import Link from "next/link";
import { Footprints, Moon, Heart, Battery, Activity } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";

type HealthEco = {
  steps: number;
  stepGoal: number;
  sleepHours: number | null;
  restingHeartRate: number | null;
  recoveryScore: number | null;
  trainingReadiness: number | null;
};

export const HomeHealthEcosystem = memo(function HomeHealthEcosystem({
  health,
}: {
  health: HealthEco | null;
}) {
  if (!health) return null;

  const stepPct = health.stepGoal > 0 ? Math.min(100, Math.round((health.steps / health.stepGoal) * 100)) : 0;

  return (
    <PremiumCard padding="sm" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Gesundheit heute</h2>
        <Link href="/gesundheit" className="text-xs text-accent">
          Alle Daten →
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        <HealthPill
          href="/gesundheit"
          icon={Footprints}
          label="Schritte"
          value={health.steps >= 1000 ? `${Math.round(health.steps / 100) / 10}k` : String(health.steps)}
          pct={stepPct}
        />
        <HealthPill
          href="/gesundheit"
          icon={Moon}
          label="Schlaf"
          value={health.sleepHours != null ? `${health.sleepHours.toFixed(1)}h` : "—"}
        />
        <HealthPill
          href="/gesundheit"
          icon={Heart}
          label="Puls"
          value={health.restingHeartRate != null ? `${health.restingHeartRate}` : "—"}
        />
        <HealthPill
          href="/gesundheit"
          icon={Battery}
          label="Recovery"
          value={health.recoveryScore != null ? `${health.recoveryScore}%` : "—"}
        />
        <HealthPill
          href="/gesundheit"
          icon={Activity}
          label="Bereit"
          value={health.trainingReadiness != null ? `${health.trainingReadiness}%` : "—"}
        />
      </div>
    </PremiumCard>
  );
});

const HealthPill = memo(function HealthPill({
  href,
  icon: Icon,
  label,
  value,
  pct,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  pct?: number;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06] py-2 px-1 active:scale-95 transition-transform"
    >
      <Icon className="h-3.5 w-3.5 text-accent" />
      <span className="text-[9px] text-zinc-500 truncate w-full text-center">{label}</span>
      <span className="text-xs font-bold text-white tabular-nums">{value}</span>
      {pct != null && (
        <div className="w-full h-0.5 rounded-full bg-zinc-800 mt-0.5 overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-accent")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </Link>
  );
});
