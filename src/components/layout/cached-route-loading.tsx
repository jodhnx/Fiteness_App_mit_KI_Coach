"use client";

import { memo, useMemo } from "react";
import { usePathname } from "next/navigation";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, NUTRITION_DASHBOARD_CACHE_KEY } from "@/lib/nutrition-sync";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
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

/** Prefer live URL during soft nav — React pathname can lag one frame behind. */
function useTransitionPathname() {
  const reactPath = usePathname();
  if (typeof window !== "undefined") {
    return window.location.pathname || reactPath;
  }
  return reactPath;
}

export const HomeRoutePreview = memo(function HomeRoutePreview() {
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
  const displayName = useDisplayName(home.userName);

  const trainingStatus = useMemo(() => {
    if (home.activeSession?.id) return "active" as const;
    const completedToday =
      home.lastCompletedWorkout?.completedAt &&
      isSameDay(new Date(home.lastCompletedWorkout.completedAt), new Date());
    if (completedToday) return "done" as const;
    if (home.nextWorkout?.dayId) return "planned" as const;
    return "open" as const;
  }, [home]);

  return (
    <div className="space-y-3 pb-4 max-w-lg mx-auto">
      <HomeGreeting name={displayName} />
      <HomeDashboardPremium
        nutrition={nutrition}
        steps={home.healthToday?.steps ?? 0}
        stepGoal={home.healthToday?.stepGoal ?? 10_000}
        sleepHours={home.healthToday?.sleepHours ?? null}
        weightKg={home.weightKg}
        trainingStatus={trainingStatus}
        trainingLabel={
          trainingStatus === "planned" ? home.nextWorkout?.dayName : undefined
        }
        activeSessionId={home.activeSession?.id ?? null}
        recoveryScore={home.healthToday?.recoveryScore ?? null}
      />
    </div>
  );
});

/** Route transition placeholder — matches destination via live URL, never wrong tab. */
export const CachedRouteLoading = memo(function CachedRouteLoading() {
  const pathname = useTransitionPathname();

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

  if (pathname.startsWith("/home") || pathname === "/") {
    // Persistent tabs keep real home; never swap in a partial preview
    return null;
  }

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
        <PageHeader title="Ernährung" />
        <PremiumCard glow className="flex flex-col items-center py-6">
          <p className="text-xs text-zinc-500 mb-2">Kalorien übrig</p>
          <p className="text-4xl font-bold text-white tabular-nums">
            {Math.max(
              0,
              Math.round(
                (nutrition.targets?.calories ?? 0) - (nutrition.consumed?.calories ?? 0)
              )
            ).toLocaleString("de-DE")}
          </p>
          <p className="text-xs text-zinc-500 mt-2 tabular-nums">
            {Math.round(nutrition.consumed?.calories ?? 0).toLocaleString("de-DE")} /{" "}
            {Math.round(nutrition.targets?.calories ?? 0).toLocaleString("de-DE")} kcal
          </p>
        </PremiumCard>
        <PremiumCard padding="sm" className="h-14 flex items-center px-4">
          <span className="text-sm text-zinc-400">🍳 Frühstück</span>
        </PremiumCard>
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
      </div>
    );
  }

  // Default / settings — no fake home shell (avoids flash when leaving tabs)
  return null;
});
