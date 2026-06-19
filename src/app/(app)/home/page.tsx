"use client";

import { useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import { type HomeDataPayload } from "@/lib/home-defaults";
import { useHomeLiveData } from "@/hooks/use-home-live-data";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeLoadingSkeleton } from "@/components/home/home-loading-skeleton";
import { HomeHeaderBar } from "@/components/home/home-header-bar";
import { HomeTodayProgressCard } from "@/components/home/home-today-progress-card";
import { HomeNextTrainingCard } from "@/components/home/home-next-training-card";
import { HomeKiTipCard } from "@/components/home/home-ki-tip-card";
import { MuscleRecoveryPanel } from "@/components/workout/muscle-recovery-panel";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { refreshCached, isCacheStale } from "@/lib/client-cache";
import { usePrefetchedProfile } from "@/components/providers/profile-data-provider";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const profile = usePrefetchedProfile();
  const { data: rawData, loading, error, timedOut, reload } = useCachedFetch<HomeDataPayload>(
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
  const userName = data.userName ?? profile?.user?.name;
  const userImage = data.userImage ?? profile?.user?.image;

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

  if (loading && !rawData) {
    return <HomeLoadingSkeleton />;
  }

  return (
    <div className="space-y-5 pb-4 max-w-lg mx-auto">
      <div className="flex items-start justify-between gap-2">
        <HomeHeaderBar
          name={userName}
          image={userImage}
          streakDays={trainingStreakDays}
          level={level}
          levelName={levelName}
        />
        {error && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 mt-2"
            onClick={reload}
            aria-label="Neu laden"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {(error || timedOut) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error ?? "Aktualisierung im Hintergrund…"}
        </div>
      )}

      <HomeTodayProgressCard nutrition={nutrition} steps={steps} stepGoal={stepGoal} />

      <HomeNextTrainingCard
        nextWorkout={data.nextWorkout ?? null}
        activeSessionId={data.activeSession?.id}
        recoveryMuscles={recoveryMuscles}
      />

      {recoveryMuscles.length > 0 && (
        <MuscleRecoveryPanel muscles={recoveryMuscles} compact showLink />
      )}

      <HomeKiTipCard coach={data.coach} />
    </div>
  );
}
