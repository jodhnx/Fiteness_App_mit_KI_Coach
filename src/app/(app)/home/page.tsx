"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { WORKOUT_ACTIVE_EVENT } from "@/lib/workout-cache-sync";
import { type HomeDataPayload } from "@/lib/home-defaults";
import { useHomeLiveData } from "@/hooks/use-home-live-data";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { useDisplayName } from "@/hooks/use-display-name";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeStatsStrip } from "@/components/home/home-stats-strip";
import { HomeStatusHeroCard } from "@/components/home/home-status-hero-card";
import { HomePlannedTrainingCard } from "@/components/home/home-planned-training-card";
import { HomeDayFocusCard } from "@/components/home/home-day-focus-card";
import { HomeProgressGrid } from "@/components/home/home-progress-grid";
import { HomeRecentAchievements } from "@/components/home/home-recent-achievements";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { computeHomeHighlight, buildDayFocusItems } from "@/lib/home-smart-layout";
import { getCached } from "@/lib/client-cache";
import { isSameDay } from "date-fns";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const [workoutCleared, setWorkoutCleared] = useState(false);
  const hasInitialCache = useMemo(() => getCached(HOME_DATA_CACHE_KEY) != null, []);

  const { data: rawData } = useCachedFetch<HomeDataPayload>(
    HOME_DATA_CACHE_KEY,
    "/api/home",
    120_000,
    6_000,
    { revalidateOnMount: !hasInitialCache, staleRatio: 0.88 }
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

  const activeSessionId = workoutCleared ? null : data.activeSession?.id ?? null;
  const trainingStreakDays =
    data.trainingStreak?.currentDays ?? data.streak?.currentDays ?? 0;
  const level = data.gamification?.level ?? 0;
  const levelName = data.gamification?.levelName;

  const recoveryMuscles: MuscleRecovery[] = useMemo(
    () => filterDisplayMuscles((data.recovery?.muscles ?? []) as MuscleRecovery[]),
    [data.recovery?.muscles]
  );

  const highlight = useMemo(
    () => computeHomeHighlight(data, nutrition, activeSessionId),
    [data, nutrition, activeSessionId]
  );

  const dayFocusItems = useMemo(
    () => buildDayFocusItems(data, recoveryMuscles),
    [data, recoveryMuscles]
  );

  const trainingStatus = useMemo(() => {
    if (activeSessionId) return "active" as const;
    const completedToday =
      data.lastCompletedWorkout?.completedAt &&
      isSameDay(new Date(data.lastCompletedWorkout.completedAt), new Date());
    if (completedToday) return "done" as const;
    if (data.nextWorkout?.dayId) return "planned" as const;
    return "open" as const;
  }, [activeSessionId, data.lastCompletedWorkout, data.nextWorkout?.dayId]);

  const steps = data.healthToday?.steps ?? 0;
  const stepGoal = data.healthToday?.stepGoal ?? 10_000;

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
    <div className="space-y-3 pb-4 max-w-lg mx-auto">
      <HomeGreeting name={displayName} />

      <HomeStatsStrip
        weightKg={data.weightKg}
        streakDays={trainingStreakDays}
        level={level}
        levelName={levelName}
        highlight={highlight === "streak" ? "streak" : null}
      />

      <HomeStatusHeroCard
        nutrition={nutrition}
        steps={steps}
        stepGoal={stepGoal}
        trainingStatus={trainingStatus}
        highlight={
          highlight === "calories" ? "calories" : highlight === "training" ? "training" : null
        }
      />

      <HomePlannedTrainingCard
        nextWorkout={data.nextWorkout ?? null}
        activeSessionId={activeSessionId}
        lastCompleted={data.lastCompletedWorkout}
        recoveryMuscles={recoveryMuscles}
        highlight={highlight === "training"}
      />

      <HomeDayFocusCard items={dayFocusItems} />

      <HomeProgressGrid
        home={data}
        nutrition={nutrition}
        streakDays={trainingStreakDays}
        streakHighlight={highlight === "streak"}
      />

      <HomeRecentAchievements achievements={data.recentAchievements ?? []} />
    </div>
  );
}
