"use client";

import { useEffect } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import { type HomeDataPayload } from "@/lib/home-defaults";
import { useHomeLiveData } from "@/hooks/use-home-live-data";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { RefreshCw, AlertCircle, Play, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeTodayProgressCard } from "@/components/home/home-today-progress-card";
import { HomeNextTrainingCard } from "@/components/home/home-next-training-card";
import { HomeWeekProgressCard } from "@/components/home/home-week-progress-card";
import { HomeKiTipCard } from "@/components/home/home-ki-tip-card";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { refreshCached, isCacheStale } from "@/lib/client-cache";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const { data: rawData, error, timedOut, reload } = useCachedFetch<HomeDataPayload>(
    HOME_DATA_CACHE_KEY,
    "/api/home",
    120_000,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.98 }
  );

  const data = useHomeLiveData(rawData);
  const { dashboard: nutrition } = useCentralNutrition();

  useEffect(() => {
    if (rawData) hydrateHomeSectionCaches(rawData);
  }, [rawData]);

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

  const steps = data.healthToday?.steps ?? 0;
  const stepGoal = data.healthToday?.stepGoal ?? 10000;
  const trainingStreakDays =
    data.trainingStreak?.currentDays ?? data.streak?.currentDays ?? 0;
  const level = data.gamification?.level ?? 0;
  const levelName = data.gamification?.levelName;
  const activeSessionId = data.activeSession?.id;

  const recoveryMuscles: MuscleRecovery[] = filterDisplayMuscles(
    (data.recovery?.muscles ?? []) as MuscleRecovery[]
  );

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
    <div className="space-y-4 pb-2 max-w-lg mx-auto -mt-1">
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

      {(trainingStreakDays > 0 || level > 0) && (
        <div className="flex items-center gap-2 flex-wrap px-0.5">
          {trainingStreakDays > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 text-[11px] font-medium text-orange-400">
              <Flame className="h-3 w-3" />
              {trainingStreakDays} Tage Streak
            </span>
          )}
          {level > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 text-[11px] font-medium text-violet-400">
              <Sparkles className="h-3 w-3" />
              Level {level}
              {levelName ? ` · ${levelName}` : ""}
            </span>
          )}
        </div>
      )}

      {activeSessionId && (
        <Link href={`/workouts/live/${activeSessionId}`}>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-cyan-300/80 font-medium">
                Training läuft
              </p>
              <p className="text-sm font-semibold text-white truncate">Jetzt fortsetzen</p>
            </div>
            <Play className="h-5 w-5 text-cyan-400 shrink-0" />
          </div>
        </Link>
      )}

      <HomeTodayProgressCard nutrition={nutrition} steps={steps} stepGoal={stepGoal} />

      <HomeNextTrainingCard
        nextWorkout={data.nextWorkout ?? null}
        activeSessionId={activeSessionId}
        recoveryMuscles={recoveryMuscles}
      />

      <HomeWeekProgressCard home={data} streakDays={trainingStreakDays} />

      <HomeKiTipCard coach={data.coach} />
    </div>
  );
}
