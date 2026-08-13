"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Footprints, Flame, MapPin, Watch } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { getPhoneStepsToday } from "@/lib/phone-sensors";

/** Instant activity strip on Progress — cache-first, no spinner. */
export const ProgressActivityStrip = memo(function ProgressActivityStrip() {
  const health = useMemo(() => {
    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    const phone = typeof window !== "undefined" ? getPhoneStepsToday() : null;
    const steps = Math.max(home?.healthToday?.steps ?? 0, phone?.steps ?? 0);
    return {
      steps,
      stepGoal: home?.healthToday?.stepGoal ?? 10_000,
      calories: home?.healthToday?.caloriesBurned ?? 0,
      distanceM: home?.healthToday?.distanceM ?? 0,
      sleepHours: home?.healthToday?.sleepHours ?? null,
    };
  }, []);

  const stepPct =
    health.stepGoal > 0
      ? Math.min(100, Math.round((health.steps / health.stepGoal) * 100))
      : 0;

  return (
    <PremiumCard padding="sm" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Aktivität heute</h2>
        <Link
          href="/settings#settings-geraete"
          className="text-xs text-accent flex items-center gap-1"
        >
          <Watch className="h-3.5 w-3.5" /> Geräte
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
          <div className="flex items-center gap-1 text-[9px] uppercase text-zinc-500">
            <Footprints className="h-3 w-3 text-cyan-400" /> Schritte
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {health.steps > 0 ? health.steps.toLocaleString("de-DE") : "—"}
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${stepPct}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
          <div className="flex items-center gap-1 text-[9px] uppercase text-zinc-500">
            <Flame className="h-3 w-3 text-orange-400" /> Kalorien
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {health.calories > 0 ? health.calories.toLocaleString("de-DE") : "—"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">verbraucht</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
          <div className="flex items-center gap-1 text-[9px] uppercase text-zinc-500">
            <MapPin className="h-3 w-3 text-violet-400" /> Distanz
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {health.distanceM > 0
              ? `${(health.distanceM / 1000).toFixed(1)} km`
              : "—"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            {health.sleepHours != null ? `Schlaf ${health.sleepHours.toFixed(1)}h` : "auto"}
          </p>
        </div>
      </div>
      {health.steps === 0 && (
        <p className="text-xs text-zinc-500">
          Schritte werden automatisch von Smartwatch oder Smartphone erfasst.{" "}
          <Link href="/settings#settings-geraete" className="text-accent underline">
            Gerät verbinden
          </Link>
        </p>
      )}
    </PremiumCard>
  );
});
