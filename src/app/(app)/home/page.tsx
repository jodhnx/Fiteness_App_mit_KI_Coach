"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { WORKOUT_ACTIVE_EVENT, WORKOUT_ACTIVE_CACHE_KEY } from "@/lib/workout-cache-sync";
import { getCached } from "@/lib/client-cache";
import { useBootHomeData } from "@/hooks/use-boot-home-data";
import { useDisplayName } from "@/hooks/use-display-name";
import { PageShell } from "@/components/layout/page-shell";
import { HomePhoneStepsHint } from "@/components/home/home-phone-steps-hint";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeTodayOverview } from "@/components/home/home-today-overview";
import { HomePlannedTrainingCard } from "@/components/home/home-planned-training-card";
import { HomeCoachBriefing } from "@/components/home/home-coach-briefing";
import { PageIntro } from "@/components/guide/page-intro";
import { HomeWidgetBoard } from "@/components/home/home-widget-board";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { computeHomeHighlight, buildDayFocusItems } from "@/lib/home-smart-layout";
import { isSameDay } from "date-fns";
import { HOME_DATA_CACHE_KEY, PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import { canonicalNutritionForDisplay } from "@/lib/nutrition-to-home";
import { HomeQuickActions } from "@/components/home/home-quick-actions";
import { HomeQuickStats } from "@/components/home/home-quick-stats";
import { resolveNutritionDisplayState } from "@/lib/nutrition-display";
import { isBootSettled } from "@/lib/app-init";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";

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
const HomeDashboardPremium = dynamic(
  () =>
    import("@/components/home/home-dashboard-premium").then((m) => ({
      default: m.HomeDashboardPremium,
    })),
  { ssr: false }
);
const HomeTodayGlance = dynamic(
  () =>
    import("@/components/home/home-today-glance").then((m) => ({
      default: m.HomeTodayGlance,
    })),
  { ssr: false }
);
const HomeDayFocusCard = dynamic(
  () =>
    import("@/components/home/home-day-focus-card").then((m) => ({
      default: m.HomeDayFocusCard,
    })),
  { ssr: false }
);
const QuickAccessRail = dynamic(
  () =>
    import("@/components/guide/quick-access-rail").then((m) => ({
      default: m.QuickAccessRail,
    })),
  { ssr: false }
);

export default function HomePage() {
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
  const { dashboard: nutritionStore } = useCentralNutrition();
  const nutrition = useMemo(
    () => canonicalNutritionForDisplay(nutritionStore, data),
    [nutritionStore, data]
  );
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
    if (trainingStatus === "planned" && trainingLabel) {
      return `Heute: ${trainingLabel}`;
    }
    return null;
  }, [trainingStatus, trainingLabel]);

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
  const caloriesReady = (nutrition.targets?.calories ?? 0) > 0;
  const profileCached = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY, {
    allowStale: true,
  });
  const profileHasTarget =
    (profileCached?.calculations?.calorieTarget ?? 0) > 0 ||
    (typeof profileCached?.profile?.calorieTarget === "number" &&
      (profileCached.profile.calorieTarget as number) > 0);
  // Zero targets while boot still running = loading, NEVER "Kalorienziel festlegen".
  const bootPending =
    !caloriesReady &&
    !isBootSettled() &&
    (getCached(HOME_DATA_CACHE_KEY, { allowStale: true }) == null ||
      !profileHasTarget ||
      !data.userName);

  const workoutHref = activeSessionId
    ? `/workouts/live/${activeSessionId}`
    : data.nextWorkout?.dayId
      ? "/workouts"
      : "/workouts/quick";
  const workoutActionLabel = activeSessionId ? "Weiter" : "Workout";
  const trainingHint =
    trainingStatus === "active"
      ? "Training läuft — jetzt fortsetzen."
      : trainingStatus === "planned" && data.nextWorkout?.dayName
        ? `Heute ist ${data.nextWorkout.dayName} geplant.`
        : null;

  const calState = resolveNutritionDisplayState(nutrition, { loading: bootPending });
  const quickTrainingLabel =
    trainingStatus === "active"
      ? "Läuft jetzt"
      : trainingStatus === "done"
        ? "Erledigt"
        : data.nextWorkout?.dayName
          ? data.nextWorkout.dayName
          : "Heute geplant";
  const nutritionOverviewLabel =
    calState.kind === "ready"
      ? calState.cal.isOver
        ? `${calState.cal.overBy.toLocaleString("de-DE")} über Ziel`
        : "Heute tracken"
      : calState.kind === "missing_target"
        ? "Ziel setzen"
        : "…";

  return (
    <PageShell className="space-y-2.5 lg:space-y-3">
      <HomeGreeting
        name={displayName}
        streakDays={nutritionStreakDays}
        cue={greetingCue}
      />

      <HomeTodayOverview
        nutrition={nutrition}
        loading={bootPending}
        steps={serverSteps}
        stepGoal={stepGoal}
        trainingHint={trainingHint}
      />

      <HomeQuickActions
        workoutHref={workoutHref}
        workoutLabel={workoutActionLabel}
      />

      <HomeQuickStats
        trainingLabel={quickTrainingLabel}
        trainingHref={workoutHref}
        nutritionLabel={nutritionOverviewLabel}
        steps={serverSteps}
        stepGoal={stepGoal}
        waterMl={nutrition.water?.consumedMl ?? 0}
        waterTargetMl={nutrition.water?.targetMl ?? 2500}
      />

      <HomeWidgetBoard
        pinFirst={activeSessionId ? "training" : null}
        slots={{
          todayOverview: () => null,
          quickAccess: () => (
            <QuickAccessRail
              training={
                activeSessionId
                  ? {
                      href: `/workouts/live/${activeSessionId}`,
                      label: "Weiter",
                    }
                  : trainingStatus === "done"
                    ? { href: "/workouts", label: "Training" }
                    : data.nextWorkout?.dayId
                      ? { label: "Starten", onStart: () => void startTraining() }
                      : { href: "/workouts/quick", label: "Training" }
              }
            />
          ),
          dashboard: () => (
            <HomeDashboardPremium
              nutrition={nutrition}
              loading={bootPending}
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
          dayGoals: () => (
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
          health: () => (
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
          training: () => (
            <HomePlannedTrainingCard
              nextWorkout={data.nextWorkout ?? null}
              activeSessionId={activeSessionId}
              lastCompleted={data.lastCompletedWorkout}
              recoveryMuscles={recoveryMuscles}
              highlight={highlight === "training"}
            />
          ),
          coachBriefing: () => (
            <HomeCoachBriefing
              intelligence={data.intelligence}
              adaptiveRecommendations={data.adaptiveRecommendations}
              dailyActionPlan={data.dailyActionPlan}
            />
          ),
          todayGlance: () => (
            <HomeTodayGlance
              nutrition={nutrition}
              trainingStatus={trainingStatus}
              trainingLabel={trainingLabel}
              activeSessionId={activeSessionId}
            />
          ),
          dayFocus: () => <HomeDayFocusCard items={dayFocusItems} />,
          progress: () => (
            <HomeProgressGrid
              home={data}
              nutrition={nutrition}
              streakDays={nutritionStreakDays}
              streakHighlight={highlight === "streak"}
            />
          ),
          daySummary: () => (
            <HomeDaySummary
              caloriesLeft={caloriesReady ? nutrition.remaining.calories : null}
              proteinG={nutrition.consumed.proteinG}
              proteinTarget={nutrition.targets.proteinG}
              steps={serverSteps}
              stepGoal={stepGoal}
              sleepHours={data.healthToday?.sleepHours ?? null}
              streakDays={nutritionStreakDays}
              trainingLabel={trainingLabel}
            />
          ),
          achievements: () => (
            <HomeRecentAchievements achievements={data.recentAchievements ?? []} />
          ),
        }}
      />

      <PageIntro pageId="home" />
      <HomePhoneStepsHint />
    </PageShell>
  );
}
