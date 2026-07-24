"use client";

import { memo, useMemo } from "react";
import { usePathname } from "next/navigation";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { NUTRITION_DASHBOARD_CACHE_KEY } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeDashboardPremium } from "@/components/home/home-dashboard-premium";
import { PageHeader } from "@/components/layout/page-header";
import { PremiumCard } from "@/components/ui/premium-card";
import { useDisplayName } from "@/hooks/use-display-name";
import { createEmptyHomeData } from "@/lib/home-defaults";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";
import { isSameDay } from "date-fns";

/** Route transition placeholder — must match real page layout (no old Home UI). */
export const CachedRouteLoading = memo(function CachedRouteLoading() {
  const pathname = usePathname();

  const home = useMemo(
    () => getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY) ?? createEmptyHomeData(),
    []
  );
  const nutrition = useMemo(
    () =>
      getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY) ??
      createEmptyNutritionDashboard(),
    []
  );
  const progress = useMemo(
    () => getCached<{ profile?: { weightKg: number | null } }>(PROGRESS_CACHE_KEY),
    []
  );

  const displayName = useDisplayName(home.userName);
  const trainingStreakDays =
    home.trainingStreak?.currentDays ?? home.streak?.currentDays ?? 0;

  const trainingStatus = useMemo(() => {
    if (home.activeSession?.id) return "active" as const;
    const completedToday =
      home.lastCompletedWorkout?.completedAt &&
      isSameDay(new Date(home.lastCompletedWorkout.completedAt), new Date());
    if (completedToday) return "done" as const;
    if (home.nextWorkout?.dayId) return "planned" as const;
    return "open" as const;
  }, [home]);

  if (pathname.startsWith("/progress")) {
    const weight = progress?.profile?.weightKg;
    return (
      <div className="space-y-5 max-w-2xl mx-auto pb-28">
        <PageHeader title="Fortschritt" subtitle="Transformation · Gewicht · Historie" />
        <PremiumCard>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Gewicht</p>
          <p className="text-3xl font-bold text-accent tabular-nums mt-1">
            {weight != null
              ? `${weight.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg`
              : "—"}
          </p>
        </PremiumCard>
        <div className="grid grid-cols-2 gap-2">
          {["Kalorien", "Protein", "Volumen", "Aktivität"].map((label) => (
            <PremiumCard key={label} padding="sm" className="h-24">
              <p className="text-[10px] text-zinc-500">{label}</p>
            </PremiumCard>
          ))}
        </div>
      </div>
    );
  }

  if (pathname.startsWith("/nutrition")) {
    return (
      <div className="space-y-3 max-w-lg mx-auto pb-4">
        <PremiumCard glow>
          <p className="text-xs text-zinc-500">Kalorien heute</p>
          <p className="text-3xl font-bold text-accent tabular-nums">
            {Math.round(nutrition.consumed?.calories ?? 0).toLocaleString("de-DE")}
            <span className="text-sm font-normal text-zinc-500 ml-1">
              / {Math.round(nutrition.targets?.calories ?? 0).toLocaleString("de-DE")}
            </span>
          </p>
        </PremiumCard>
        <div className="grid grid-cols-4 gap-2">
          {["P", "KH", "F", "B"].map((m) => (
            <PremiumCard key={m} padding="sm" className="h-14 flex items-center justify-center">
              <span className="text-xs text-zinc-500">{m}</span>
            </PremiumCard>
          ))}
        </div>
      </div>
    );
  }

  if (pathname.startsWith("/workouts")) {
    return (
      <div className="space-y-3 max-w-lg mx-auto pb-24">
        {["Meine Pläne", "Quick Workout", "Übungen"].map((title) => (
          <PremiumCard key={title} padding="sm" className="h-20 flex items-center">
            <span className="font-medium text-zinc-300">{title}</span>
          </PremiumCard>
        ))}
      </div>
    );
  }

  if (pathname.startsWith("/coach")) {
    return (
      <div className="max-w-lg mx-auto pb-4">
        <PremiumCard className="h-[60vh] flex items-end p-4">
          <p className="text-sm text-zinc-500">Coach bereit…</p>
        </PremiumCard>
      </div>
    );
  }

  if (pathname.startsWith("/geraete") || pathname.startsWith("/gesundheit")) {
    return (
      <div className="space-y-3 max-w-2xl mx-auto pb-28">
        <PageHeader
          title={pathname.startsWith("/geraete") ? "Geräte & Gesundheit" : "Gesundheit"}
        />
        <PremiumCard className="h-24">
          <span className="sr-only">Laden</span>
        </PremiumCard>
        <PremiumCard className="h-32">
          <span className="sr-only">Laden</span>
        </PremiumCard>
      </div>
    );
  }

  // Home — identical structure to live HomeDashboardPremium (no legacy strip/hero)
  return (
    <div className="space-y-3 pb-4 max-w-lg mx-auto">
      <HomeGreeting name={displayName} />
      <HomeDashboardPremium
        nutrition={nutrition}
        steps={home.healthToday?.steps ?? 0}
        stepGoal={home.healthToday?.stepGoal ?? 10_000}
        sleepHours={home.healthToday?.sleepHours ?? null}
        weightKg={home.weightKg}
        streakDays={trainingStreakDays}
        trainingStatus={trainingStatus}
        trainingLabel={
          trainingStatus === "planned" ? home.nextWorkout?.dayName : undefined
        }
      />
    </div>
  );
});
