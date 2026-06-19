"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import { type HomeDataPayload } from "@/lib/home-defaults";
import { useHomeLiveData } from "@/hooks/use-home-live-data";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { RefreshCw, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeuteHeroCard } from "@/components/home/heute-hero-card";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { HomeNextWorkoutCard } from "@/components/home/home-next-workout-card";
import { HomeWeekOverview } from "@/components/home/home-week-overview";
import { HomeChallengesRow } from "@/components/home/home-challenges-row";
import { HomeBodyCard } from "@/components/home/home-body-card";
import { HomeAchievementsCard } from "@/components/home/home-achievements-card";
import { HomeCoachRecommendations } from "@/components/home/home-coach-recommendations";
import { HomeGreeting } from "@/components/home/home-greeting";
import { useDisplayName } from "@/hooks/use-display-name";
import { HomePlannedWorkouts } from "@/components/home/home-planned-workouts";
import { HomeCalorieTrend } from "@/components/home/home-calorie-trend";
import { HomeWeightGoalCard } from "@/components/home/home-weight-goal-card";
import { HomeMotivationCard } from "@/components/home/home-motivation-card";
import { HomeDashboardGrid } from "@/components/home/home-dashboard-grid";
import { HomeInsightCards } from "@/components/home/home-insight-cards";
import { HomeLoadingSkeleton } from "@/components/home/home-loading-skeleton";
import { refreshCached, isCacheStale } from "@/lib/client-cache";

export default function HomePage() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
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
  const caloriesBurned =
    data.caloriesBurnedTotal ?? data.healthToday?.caloriesBurned ?? 0;
  const trainingStreakDays =
    data.trainingStreak?.currentDays ?? data.streak?.currentDays ?? 0;

  const coach = data.coach;
  const nextWorkout = data.nextWorkout ?? null;
  const activeSessionId = data.activeSession?.id ?? null;
  const displayName = useDisplayName(data.userName);

  const onStartTraining = useCallback(async () => {
    if (activeSessionId) {
      router.push(`/workouts/live/${activeSessionId}`);
      return;
    }
    if (nextWorkout?.dayId) {
      const res = await fetch("/api/workouts/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          workoutPlanId: nextWorkout.planId,
          workoutDayId: nextWorkout.dayId,
          name: `${nextWorkout.planName} – ${nextWorkout.dayName}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) router.push(`/workouts/live/${body.session.id}`);
      else router.push("/workouts");
      return;
    }
    router.push("/workouts");
  }, [activeSessionId, nextWorkout, router]);

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
    <div className="space-y-4 pb-2">
      <div className="flex items-start justify-between gap-2">
        <HomeGreeting name={displayName} />
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

      <HeuteHeroCard
        nutrition={nutrition}
        steps={steps}
        stepGoal={stepGoal}
        caloriesBurned={caloriesBurned}
        trainingStreakDays={trainingStreakDays}
      />

      <HomeDashboardGrid home={data} nutrition={nutrition} />

      <HomeInsightCards home={data} />

      <HomeMotivationCard streakDays={trainingStreakDays} />

      <HomePlannedWorkouts home={data} />

      <HomeCalorieTrend home={data} />

      {data.weightGoal && (
        <HomeWeightGoalCard
          weightGoal={data.weightGoal}
          calorieTarget={data.calorieTarget}
        />
      )}

      <HomeWeekOverview home={data} />

      {data.challenges && data.challenges.length > 0 && (
        <HomeChallengesRow challenges={data.challenges} />
      )}

      {nextWorkout && (
        <HomeNextWorkoutCard nextWorkout={nextWorkout} activeSessionId={activeSessionId} />
      )}

      {activeSessionId && (
        <Link href={`/workouts/live/${activeSessionId}`}>
          <Button className="w-full btn-accent h-12 rounded-2xl">
            <Play className="h-4 w-4 mr-2" />
            Training fortsetzen
          </Button>
        </Link>
      )}

      {data.bodyTransformation && <HomeBodyCard body={data.bodyTransformation} />}

      {data.gamification && <HomeAchievementsCard g={data.gamification} />}

      <HomeCoachRecommendations coach={coach} />

      <HomeQuickActions onStartTraining={onStartTraining} />
    </div>
  );
}
