"use client";

import { memo } from "react";
import Link from "next/link";
import { Scale, Target, Flame, Beef, Footprints, Dumbbell } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, NUTRITION_DASHBOARD_CACHE_KEY } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { getPhoneStepsToday } from "@/lib/phone-sensors";

type Props = {
  currentKg: number | null;
  targetKg: number | null;
  trainingSessions?: number;
};

/** Top overview strip — weight, goals, macros, steps, training. */
export const ProgressOverviewCards = memo(function ProgressOverviewCards({
  currentKg,
  targetKg,
  trainingSessions = 0,
}: Props) {
  const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  const nutrition = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
  const phone = typeof window !== "undefined" ? getPhoneStepsToday() : null;
  const steps = Math.max(home?.healthToday?.steps ?? 0, phone?.steps ?? 0);
  const stepGoal = home?.healthToday?.stepGoal ?? 10_000;
  const calories = Math.round(nutrition?.consumed?.calories ?? 0);
  const calorieTarget = Math.round(nutrition?.targets?.calories ?? 0);
  const protein = Math.round(nutrition?.consumed?.proteinG ?? 0);
  const proteinTarget = Math.round(nutrition?.targets?.proteinG ?? 0);

  const cards = [
    {
      key: "w",
      label: "Gewicht",
      value:
        currentKg != null
          ? `${currentKg.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg`
          : "—",
      sub: targetKg != null ? `Ziel ${targetKg.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg` : "Ziel setzen",
      icon: Scale,
      tint: "text-emerald-400",
      href: "/progress?log=1",
    },
    {
      key: "g",
      label: "Zielgewicht",
      value:
        targetKg != null
          ? `${targetKg.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg`
          : "—",
      sub: currentKg != null && targetKg != null
        ? `${(currentKg - targetKg).toLocaleString("de-DE", { maximumFractionDigits: 1, signDisplay: "exceptZero" })} kg Diff.`
        : "In Einstellungen",
      icon: Target,
      tint: "text-accent",
      href: "/settings#settings-ziele",
    },
    {
      key: "c",
      label: "Kalorien",
      value: calories > 0 ? calories.toLocaleString("de-DE") : "—",
      sub: calorieTarget > 0 ? `Ziel ${calorieTarget.toLocaleString("de-DE")}` : "heute",
      icon: Flame,
      tint: "text-orange-400",
      href: "/nutrition",
    },
    {
      key: "p",
      label: "Protein",
      value: protein > 0 ? `${protein}g` : "—",
      sub: proteinTarget > 0 ? `Ziel ${proteinTarget}g` : "heute",
      icon: Beef,
      tint: "text-rose-400",
      href: "/nutrition",
    },
    {
      key: "s",
      label: "Schritte",
      value: steps > 0 ? steps.toLocaleString("de-DE") : "—",
      sub: `Ziel ${stepGoal.toLocaleString("de-DE")}`,
      icon: Footprints,
      tint: "text-cyan-400",
      href: "/settings#settings-geraete",
    },
    {
      key: "t",
      label: "Training",
      value: trainingSessions > 0 ? String(trainingSessions) : "—",
      sub: "Sessions gelistet",
      icon: Dumbbell,
      tint: "text-violet-400",
      href: "/workouts",
    },
  ] as const;

  return (
    <PremiumCard padding="sm" className="space-y-2">
      <h2 className="text-sm font-semibold text-white px-0.5">Übersicht</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.key}
              href={c.href}
              prefetch
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 active:bg-white/[0.06]"
            >
              <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-zinc-500">
                <Icon className={`h-3 w-3 ${c.tint}`} />
                {c.label}
              </div>
              <p className="text-lg font-bold text-white tabular-nums mt-1 leading-tight">
                {c.value}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{c.sub}</p>
            </Link>
          );
        })}
      </div>
    </PremiumCard>
  );
});
