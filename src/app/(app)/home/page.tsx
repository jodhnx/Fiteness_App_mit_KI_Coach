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
import {
  hydrateHomeSectionCaches,
  HOME_COACH_CACHE,
  HOME_HEUTE_CACHE,
  HOME_INSIGHTS_CACHE,
  HOME_WORKOUT_CACHE,
  type HomeHeuteSection,
  type HomeInsightsSection,
  type HomeWorkoutSection,
} from "@/lib/home-section-cache";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";
import { RefreshCw, AlertCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeuteHeroCard } from "@/components/home/heute-hero-card";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { HomeCoachCard } from "@/components/home/home-coach-card";
import { HomeNextWorkoutCard } from "@/components/home/home-next-workout-card";
import { HomeInsightCards } from "@/components/home/home-insight-cards";
import { UserAvatar } from "@/components/user/user-avatar";

function greeting(name?: string | null) {
  const h = new Date().getHours();
  const part = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

export default function HomePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { data: rawData, loading, error, timedOut, reload } = useCachedFetch<HomeDataPayload>(
    HOME_DATA_CACHE_KEY,
    "/api/home",
    120_000,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const data = useMemo(
    () => normalizeHomeData(rawData ?? createEmptyHomeData()),
    [rawData]
  );

  useEffect(() => {
    if (rawData) hydrateHomeSectionCaches(normalizeHomeData(rawData));
  }, [rawData]);

  const { dashboard: nutrition } = useSyncedNutrition(data.nutrition);

  const cachedHeute = getCached<HomeHeuteSection>(HOME_HEUTE_CACHE);
  const cachedCoach = getCached<HomeDataPayload["coach"]>(HOME_COACH_CACHE);
  const cachedInsights = getCached<HomeInsightsSection>(HOME_INSIGHTS_CACHE);
  const cachedWorkout = getCached<HomeWorkoutSection>(HOME_WORKOUT_CACHE);

  const heuteNutrition = nutrition ?? cachedHeute?.nutrition ?? createEmptyNutritionDashboard();
  const steps = data.healthToday?.steps ?? cachedHeute?.steps ?? 0;
  const stepGoal = data.healthToday?.stepGoal ?? cachedHeute?.stepGoal ?? 10000;
  const caloriesBurned =
    data.caloriesBurnedTotal ??
    data.healthToday?.caloriesBurned ??
    cachedHeute?.caloriesBurned ??
    0;

  const coach = data.coach.tips.length > 0 ? data.coach : cachedCoach ?? data.coach;
  const insightsHome: HomeDataPayload = {
    ...data,
    recovery: data.recovery ?? cachedInsights?.recovery,
    weeklyReport: data.weeklyReport ?? cachedInsights?.weeklyReport,
  };
  const nextWorkout = data.nextWorkout ?? cachedWorkout?.nextWorkout ?? null;
  const activeSessionId = data.activeSession?.id ?? cachedWorkout?.activeSession?.id ?? null;

  const displayName = data.userName ?? session?.user?.name ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && error) {
      console.error("Dashboard Error", error);
    }
  }, [error]);

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto space-y-4 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
        <h1 className="text-lg font-semibold text-white">Sitzung nicht erkannt</h1>
        <p className="text-sm text-zinc-400">
          Deine Anmeldung konnte nicht geladen werden. Bitte melde dich erneut an.
        </p>
        <Button type="button" onClick={() => signIn(undefined, { callbackUrl: "/home" })}>
          Erneut anmelden
        </Button>
      </div>
    );
  }

  const hasAnyCache =
    getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY) !== null ||
    cachedHeute !== null ||
    cachedCoach !== null;

  const showShell =
    hasAnyCache || rawData != null || sessionStatus !== "loading";

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-28">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            src={data.userImage ?? session?.user?.image}
            name={displayName}
            size="md"
          />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{greeting(displayName)}</h1>
            <p className="text-xs text-zinc-500">Dein Tag auf einen Blick</p>
          </div>
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
          {error ?? "Teildaten verzögert – Anzeige wird aktualisiert."}
        </div>
      )}

      {showShell ? (
        <HeuteHeroCard
          nutrition={heuteNutrition}
          steps={steps}
          stepGoal={stepGoal}
          caloriesBurned={caloriesBurned}
        />
      ) : (
        <div className="h-52 rounded-2xl bg-white/5 animate-pulse" />
      )}

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

      {activeSessionId && (
        <Link href={`/workouts/live/${activeSessionId}`}>
          <Button className="w-full btn-accent h-11">
            <Play className="h-4 w-4 mr-2" />
            Training fortsetzen
          </Button>
        </Link>
      )}

      <HomeCoachCard coach={coach} />

      {nextWorkout && (
        <HomeNextWorkoutCard nextWorkout={nextWorkout} activeSessionId={activeSessionId} />
      )}

      <HomeInsightCards home={insightsHome} />
    </div>
  );
}
