"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import { WORKOUT_ACTIVE_EVENT } from "@/lib/workout-cache-sync";
import { useBootHomeData } from "@/hooks/use-boot-home-data";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { useDisplayName } from "@/hooks/use-display-name";
import { PageShell } from "@/components/layout/page-shell";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomePhoneStepsHint } from "@/components/home/home-phone-steps-hint";
import { HomeGreeting } from "@/components/home/home-greeting";
import { HomeDashboardPremium } from "@/components/home/home-dashboard-premium";
import { HomeHealthEcosystem } from "@/components/home/home-health-ecosystem";
import { HomePlannedTrainingCard } from "@/components/home/home-planned-training-card";
import { HomeDayFocusCard } from "@/components/home/home-day-focus-card";
import { HomeProgressGrid } from "@/components/home/home-progress-grid";
import { HomeRecentAchievements } from "@/components/home/home-recent-achievements";
import { HomeDayGoals } from "@/components/home/home-day-goals";
import { HomeDaySummary } from "@/components/home/home-day-summary";
import { HomeWidgetBoard } from "@/components/home/home-widget-board";
import { QuickAccessRail } from "@/components/guide/quick-access-rail";
import { PageIntro } from "@/components/guide/page-intro";
import { HomeCoachBriefing } from "@/components/home/home-coach-briefing";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { computeHomeHighlight, buildDayFocusItems } from "@/lib/home-smart-layout";
import { isSameDay } from "date-fns";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";

export default function HomePage() {
  const { status: sessionStatus } = useSession();
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
    hydrateHomeSectionCaches(data);
  }, [data]);

  useEffect(() => {
    const onWorkout = () => setWorkoutCleared(true);
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

  const serverSteps = data.healthToday?.steps ?? 0;
  const stepGoal = data.healthToday?.stepGoal ?? 10_000;
  const ready = hasNutritionTargets(nutrition);

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
      <HomeGreeting name={displayName} streakDays={nutritionStreakDays} />

      <HomeWidgetBoard
        slots={{
          quickAccess: <QuickAccessRail />,
          dashboard: (
            <HomeDashboardPremium
                nutrition={nutrition}
                steps={serverSteps}
                stepGoal={stepGoal}
                sleepHours={data.healthToday?.sleepHours ?? null}
                weightKg={data.weightKg}
                streakDays={trainingStreakDays}
                trainingStatus={trainingStatus}
                trainingLabel={trainingLabel}
              />
          ),
          dayGoals: (
            <HomeDayGoals
              caloriesConsumed={nutrition.consumed?.calories ?? 0}
              calorieTarget={nutrition.targets?.calories ?? 0}
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
              trainingLabel={trainingLabel}
              trainingDone={trainingStatus === "done" || trainingStatus === "active"}
              proteinConsumed={nutrition.consumed?.proteinG ?? 0}
              proteinTarget={nutrition.targets?.proteinG ?? 0}
              steps={serverSteps}
              stepGoal={stepGoal}
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
