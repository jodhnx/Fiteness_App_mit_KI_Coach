"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useSyncedNutrition } from "@/hooks/use-synced-nutrition";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY } from "@/lib/nutrition-sync";
import {
  createEmptyHomeData,
  normalizeHomeData,
  type HomeDataPayload,
} from "@/lib/home-defaults";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";
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
import { UserAvatar } from "@/components/user/user-avatar";

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const part = h < 12 ? "Morgen" : h < 18 ? "Tag" : "Abend";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Guten ${part}, ${first}` : `Guten ${part}`;
}

export default function HomePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { data: rawData, error, timedOut, reload } = useCachedFetch<HomeDataPayload>(
    HOME_DATA_CACHE_KEY,
    "/api/home",
    120_000,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.98 }
  );

  const data = useMemo(
    () => normalizeHomeData(rawData ?? getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY) ?? createEmptyHomeData()),
    [rawData]
  );

  useEffect(() => {
    if (rawData) hydrateHomeSectionCaches(normalizeHomeData(rawData));
  }, [rawData]);

  const { dashboard: nutrition } = useSyncedNutrition(data.nutrition);

  const heuteNutrition = nutrition ?? data.nutrition ?? createEmptyNutritionDashboard();
  const steps = data.healthToday?.steps ?? 0;
  const stepGoal = data.healthToday?.stepGoal ?? 10000;
  const caloriesBurned =
    data.caloriesBurnedTotal ?? data.healthToday?.caloriesBurned ?? 0;
  const trainingStreakDays =
    data.trainingStreak?.currentDays ?? data.streak?.currentDays ?? 0;

  const coach = data.coach;
  const nextWorkout = data.nextWorkout ?? null;
  const activeSessionId = data.activeSession?.id ?? null;
  const displayName = data.userName ?? session?.user?.name ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("Dashboard Error", error);
    }
  }, [error]);

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
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href="/profile" prefetch className="shrink-0">
            <UserAvatar
              src={data.userImage ?? session?.user?.image}
              name={displayName}
              size="sm"
            />
          </Link>
          <p className="text-base font-semibold text-white truncate">{greeting(displayName)}</p>
        </div>
        {error && (
          <Button type="button" variant="ghost" size="icon" onClick={reload} aria-label="Neu laden">
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
        nutrition={heuteNutrition}
        steps={steps}
        stepGoal={stepGoal}
        caloriesBurned={caloriesBurned}
        trainingStreakDays={trainingStreakDays}
      />

      <HomeWeekOverview home={data} />

      {data.challenges && data.challenges.length > 0 && (
        <HomeChallengesRow challenges={data.challenges} />
      )}

      {nextWorkout && (
        <HomeNextWorkoutCard nextWorkout={nextWorkout} activeSessionId={activeSessionId} />
      )}

      {activeSessionId && (
        <Link href={`/workouts/live/${activeSessionId}`}>
          <Button className="w-full btn-accent h-11">
            <Play className="h-4 w-4 mr-2" />
            Training fortsetzen
          </Button>
        </Link>
      )}

      {data.bodyTransformation && <HomeBodyCard body={data.bodyTransformation} />}

      {data.gamification && <HomeAchievementsCard g={data.gamification} />}

      <HomeCoachRecommendations coach={coach} />

      <HomeQuickActions
        onStartTraining={async () => {
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
        }}
      />
    </div>
  );
}
