"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { WORKOUT_ACTIVE_EVENT, WORKOUT_ACTIVE_CACHE_KEY } from "@/lib/workout-cache-sync";
import { getCached } from "@/lib/client-cache";
import { useBootHomeData } from "@/hooks/use-boot-home-data";
import { useDisplayName } from "@/hooks/use-display-name";
import { PageShell } from "@/components/layout/page-shell";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomePhoneStepsHint } from "@/components/home/home-phone-steps-hint";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeTodayOverview } from "@/components/home/home-today-overview";
import { HomeDashboardPremium } from "@/components/home/home-dashboard-premium";
import { HomePlannedTrainingCard } from "@/components/home/home-planned-training-card";
import { HomeDayFocusCard } from "@/components/home/home-day-focus-card";
import { HomeCoachBriefing } from "@/components/home/home-coach-briefing";
import { HomeTodayGlance } from "@/components/home/home-today-glance";
import { QuickAccessRail } from "@/components/guide/quick-access-rail";
import { PageIntro } from "@/components/guide/page-intro";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { computeHomeHighlight, buildDayFocusItems } from "@/lib/home-smart-layout";
import { isSameDay } from "date-fns";
import { resolveNutritionDisplayState } from "@/lib/nutrition-display";

const HomeHealthEcosystem = dynamic(
  () =>
    import("@/components/home/home-health-ecosystem").then((m) => ({
      default: m.HomeHealthEcosystem,
    })),
  { ssr: false }
);
const HomeProgressGrid = dynamic(
  () =>
    import("@/components/home/home-progress-grid").then((m) => ({
      default: m.HomeProgressGrid,
    })),
  { ssr: false }
);
const HomeRecentAchievements = dynamic(
  () =>
    import("@/components/home/home-recent-achievements").then((m) => ({
      default: m.HomeRecentAchievements,
    })),
  { ssr: false }
);
const HomeDayGoals = dynamic(
  () =>
    import("@/components/home/home-day-goals").then((m) => ({
      default: m.HomeDayGoals,
    })),
  { ssr: false }
);
const HomeDaySummary = dynamic(
  () =>
    import("@/components/home/home-day-summary").then((m) => ({
      default: m.HomeDaySummary,
    })),
  { ssr: false }
);
const HomeWidgetBoard = dynamic(
  () =>
    import("@/components/home/home-widget-board").then((m) => ({
      default: m.HomeWidgetBoard,
    })),
  { ssr: false }
);

export default function HomePage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [workoutCleared, setWorkoutCleared] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem("nexform:tab-visited:home", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const data = useBootHomeData();
  const { dashboard: nutrition } = useCentralNutrition();
  const displayName = useDisplayName(data.userName);

  useEffect(() => {
    const onWorkout = () => {
      const cached = getCached<{ session?: { id: string } | null }>(
        WORKOUT_ACTIVE_CACHE_KEY,
        { allowStale: true }
      );
      setWorkoutCleared(!cached?.session?.id);
    };
    window.addEventListener(WORKOUT_ACTIVE_EVENT, onWorkout);
    return () => window.removeEventListener(WORKOUT_ACTIVE_EVENT, onWorkout);
  }, []);

  useEffect(() => {
    if (data.activeSession?.id) setWorkoutCleared(false);
  }, [data.activeSession?.id]);

  const activeSessionId = workoutCleared ? null : data.activeSession?.id ?? null;
  const nutritionStreakDays = data.nutritionStreak?.currentDays ?? 0;
  const trainingStreakDays =
    data.trainingStreak?.currentDays ?? data.streak?.currentDays ?? 0;

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

  const trainingLabel = useMemo(() => {
    if (trainingStatus === "active") return "Training läuft";
    if (trainingStatus === "done") return "Workout abgeschlossen";
    if (trainingStatus === "planned" && data.nextWorkout?.dayName) {
      const dayNum = data.nextWorkout.dayNumber;
      return dayNum != null
        ? `${data.nextWorkout.dayName} – Tag ${dayNum}`
        : data.nextWorkout.dayName;
    }
    return undefined;
  }, [trainingStatus, data.nextWorkout?.dayName, data.nextWorkout?.dayNumber]);

  const startTraining = useCallback(async () => {
    if (activeSessionId) {
      router.push(`/workouts/live/${activeSessionId}`);
      return;
    }
    if (!data.nextWorkout?.dayId) {
      router.push("/workouts/quick");
      return;
    }
    const result = await startWorkoutAndNavigate(router, {
      action: "start",
      workoutPlanId: data.nextWorkout.planId,
      workoutDayId: data.nextWorkout.dayId,
      name: `${data.nextWorkout.planName} – ${data.nextWorkout.dayName}`,
    });
    if (!result.ok) toast.error(result.error);
  }, [activeSessionId, data.nextWorkout, router]);

  const greetingCue = useMemo(() => {
    if (trainingStatus === "active") return "Training läuft — tippe zum Fortsetzen";
    const calState = resolveNutritionDisplayState(nutrition);
    if (calState.kind === "ready") {
      const { cal } = calState;
      if (!cal.isOver && cal.remaining > 0) {
        return `${cal.remaining.toLocaleString("de-DE")} kcal übrig`;
      }
      if (cal.isOver) {
        return `${cal.overBy.toLocaleString("de-DE")} kcal über dem Ziel`;
      }
      if (cal.remaining === 0 && !cal.isOver) {
        return "Kalorienziel erreicht";
      }
    }
    if (trainingStatus === "planned" && trainingLabel) {
      return `Heute: ${trainingLabel}`;
    }
    return null;
  }, [trainingStatus, trainingLabel, nutrition]);

  const weekPulse = useMemo(() => {
    const target = nutrition.targets?.calories ?? 0;
    const consumed = nutrition.consumed?.calories ?? 0;
    return {
      workouts: data.weeklyReport?.workouts ?? data.activityWeek?.count ?? 0,
      caloriePct: target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0,
      weightChangeKg: data.weeklyReport?.weightChangeKg ?? null,
      goalReached: data.weeklyReport?.goalReached ?? false,
    };
  }, [data.weeklyReport, data.activityWeek, nutrition]);

  const serverSteps = data.healthToday?.steps ?? 0;
  const stepGoal = data.healthToday?.stepGoal ?? 10_000;
  const ready = resolveNutritionDisplayState(nutrition).kind === "ready";

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
    <PageShell className="space-y-2">
      <HomeGreeting
        name={displayName}
        streakDays={nutritionStreakDays}
        cue={greetingCue}
      />

      <HomeWidgetBoard
        pinFirst={activeSessionId ? "training" : null}
        slots={{
          todayOverview: (
            <HomeTodayOverview nutrition={nutrition} />
          ),
          quickAccess: (
            <QuickAccessRail
              training={
                activeSessionId
                  ? {
                      href: `/workouts/live/${activeSessionId}`,
                      label: "Weiter",
                    }
                  : data.nextWorkout?.dayId
                    ? { label: "Starten", onStart: () => void startTraining() }
                    : { href: "/workouts/quick", label: "Training" }
              }
            />
          ),
          dashboard: (
            <HomeDashboardPremium
                nutrition={nutrition}
                steps={serverSteps}
                stepGoal={stepGoal}
                sleepHours={data.healthToday?.sleepHours ?? null}
                weightKg={data.weightKg}
                trainingStatus={trainingStatus}
                trainingLabel={trainingLabel}
                activeSessionId={activeSessionId}
                recoveryScore={data.healthToday?.recoveryScore ?? null}
                weekPulse={weekPulse}
              />
          ),
          dayGoals: (
            <HomeDayGoals
              caloriesConsumed={nutrition.consumed?.calories ?? 0}
              calorieTarget={nutrition.targets?.calories ?? 0}
              caloriesRemaining={nutrition.remaining?.calories}
              steps={serverSteps}
              stepGoal={stepGoal}
              waterMl={nutrition.water?.consumedMl ?? 0}
              waterTargetMl={nutrition.water?.targetMl ?? 2500}
              trainingDone={trainingStatus === "done" || trainingStatus === "active"}
            />
          ),
          health: (
            <HomeHealthEcosystem
              health={
                data.healthToday
                  ? {
                      steps: data.healthToday.steps,
                      stepGoal: data.healthToday.stepGoal,
                      sleepHours: data.healthToday.sleepHours ?? null,
                      restingHeartRate: data.healthToday.restingHeartRate ?? null,
                      recoveryScore: data.healthToday.recoveryScore ?? null,
                      trainingReadiness: data.healthToday.trainingReadiness ?? null,
                    }
                  : null
              }
            />
          ),
          training: (
            <HomePlannedTrainingCard
              nextWorkout={data.nextWorkout ?? null}
              activeSessionId={activeSessionId}
              lastCompleted={data.lastCompletedWorkout}
              recoveryMuscles={recoveryMuscles}
              highlight={highlight === "training"}
            />
          ),
          coachBriefing: (
            <HomeCoachBriefing
              streakDays={trainingStreakDays}
              intelligence={data.intelligence}
              adaptiveRecommendations={data.adaptiveRecommendations}
              dailyActionPlan={data.dailyActionPlan}
            />
          ),
          todayGlance: (
            <HomeTodayGlance
              nutrition={nutrition}
              trainingStatus={trainingStatus}
              trainingLabel={trainingLabel}
              activeSessionId={activeSessionId}
            />
          ),
          dayFocus: <HomeDayFocusCard items={dayFocusItems} />,
          progress: (
            <HomeProgressGrid
              home={data}
              nutrition={nutrition}
              streakDays={trainingStreakDays}
              streakHighlight={highlight === "streak"}
            />
          ),
          daySummary: (
            <HomeDaySummary
              caloriesLeft={ready ? nutrition.remaining.calories : 0}
              proteinG={nutrition.consumed.proteinG}
              proteinTarget={nutrition.targets.proteinG}
              steps={serverSteps}
              stepGoal={stepGoal}
              sleepHours={data.healthToday?.sleepHours ?? null}
              streakDays={trainingStreakDays}
              trainingLabel={trainingLabel}
            />
          ),
          achievements: (
            <HomeRecentAchievements achievements={data.recentAchievements ?? []} />
          ),
        }}
      />

      <PageIntro pageId="home" />
      <HomePhoneStepsHint />
    </PageShell>
  );
}
