"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { WORKOUT_ACTIVE_EVENT } from "@/lib/workout-cache-sync";
import { type HomeDataPayload } from "@/lib/home-defaults";
import { useHomeLiveData } from "@/hooks/use-home-live-data";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { useDisplayName } from "@/hooks/use-display-name";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeCalorieHeroCard } from "@/components/home/home-calorie-hero-card";
import { HomeMacroOverviewCard } from "@/components/home/home-macro-overview-card";
import { HomeNextTrainingCard } from "@/components/home/home-next-training-card";
import { HomeTrainingStreakCard } from "@/components/home/home-training-streak-card";
import { HomeWeightTrendCard } from "@/components/home/home-weight-trend-card";
import { HomeKiTipCard } from "@/components/home/home-ki-tip-card";
import { HomeRecentAchievements } from "@/components/home/home-recent-achievements";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { refreshCached, isCacheStale, getCached } from "@/lib/client-cache";
import { HomeLoadingSkeleton } from "@/components/home/home-loading-skeleton";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const [workoutCleared, setWorkoutCleared] = useState(false);

  const { data: rawData, error, timedOut, reload } = useCachedFetch<HomeDataPayload>(
    HOME_DATA_CACHE_KEY,
    "/api/home",
    120_000,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.98 }
  );

  const data = useHomeLiveData(rawData);
  const { dashboard: nutrition } = useCentralNutrition();
  const displayName = useDisplayName(data.userName);

  useEffect(() => {
    if (rawData) hydrateHomeSectionCaches(rawData);
  }, [rawData]);

  useEffect(() => {
    const onWorkout = () => setWorkoutCleared(true);
    const onHome = () => setWorkoutCleared(true);
    window.addEventListener(WORKOUT_ACTIVE_EVENT, onWorkout);
    window.addEventListener(HOME_DATA_EVENT, onHome);
    return () => {
      window.removeEventListener(WORKOUT_ACTIVE_EVENT, onWorkout);
      window.removeEventListener(HOME_DATA_EVENT, onHome);
    };
  }, []);

  useEffect(() => {
    if (data.activeSession?.id) setWorkoutCleared(false);
  }, [data.activeSession?.id]);

  useEffect(() => {
    if (!rawData || !isCacheStale(HOME_DATA_CACHE_KEY, 0.98)) return;
    const idle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 2000);
    const handle = idle(() => {
      refreshCached(
        HOME_DATA_CACHE_KEY,
        async () => {
          const res = await fetch("/api/home", { credentials: "same-origin" });
          if (!res.ok) throw new Error("refresh failed");
          return res.json() as Promise<HomeDataPayload>;
        },
        120_000,
        () => {},
        () => {}
      );
    });
    return () => {
      if (typeof handle === "number") {
        if (typeof cancelIdleCallback !== "undefined") cancelIdleCallback(handle);
        else clearTimeout(handle);
      }
    };
  }, [rawData]);

  const trainingStreakDays =
    data.trainingStreak?.currentDays ?? data.streak?.currentDays ?? 0;
  const activeSessionId = workoutCleared ? null : data.activeSession?.id;
  const nextWorkout = data.nextWorkout ?? null;

  const recoveryMuscles: MuscleRecovery[] = filterDisplayMuscles(
    (data.recovery?.muscles ?? []) as MuscleRecovery[]
  );

  if (sessionStatus === "loading" && !rawData && !getCached(HOME_DATA_CACHE_KEY)) {
    return <HomeLoadingSkeleton />;
  }

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="space-y-4 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
        <h1 className="text-lg font-semibold text-white">Sitzung nicht erkannt</h1>
        <Button type="button" onClick={() => signIn(undefined, { callbackUrl: "/home" })}>
          Erneut anmelden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2 max-w-lg mx-auto">
      {(error || timedOut) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error ?? "Aktualisierung im Hintergrund…"}</span>
          {error && (
            <button type="button" onClick={reload} aria-label="Neu laden">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <HomeGreeting name={displayName} />

      <HomeCalorieHeroCard nutrition={nutrition} />

      <HomeMacroOverviewCard nutrition={nutrition} />

      <HomeNextTrainingCard
        nextWorkout={nextWorkout}
        activeSessionId={activeSessionId}
        lastCompleted={data.lastCompletedWorkout}
        recoveryMuscles={recoveryMuscles}
      />

      <HomeTrainingStreakCard streakDays={trainingStreakDays} />

      <HomeWeightTrendCard home={data} />

      <HomeKiTipCard coach={data.coach} />

      <HomeRecentAchievements achievements={data.recentAchievements ?? []} />
    </div>
  );
}
