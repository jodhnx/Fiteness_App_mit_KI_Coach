"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useRouter } from "next/navigation";
import { WORKOUT_ACTIVE_CACHE_KEY, WORKOUT_ACTIVE_EVENT } from "@/lib/workout-cache-sync";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { getCached, setCached } from "@/lib/client-cache";
import { PageShell } from "@/components/layout/page-shell";
import { NextWorkoutHero } from "@/components/workout/next-workout-hero";
import { TrainingChoiceCard } from "@/components/workout/training-choice-card";
import { TrainingWeekStrip } from "@/components/workout/training-week-strip";
import { MuscleRecoveryPanel } from "@/components/workout/muscle-recovery-panel";
import { Button } from "@/components/ui/button";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import type { HomeDataPayload } from "@/lib/home-defaults";
import {
  BookOpen,
  Calendar,
  Dumbbell,
  Flame,
  FolderOpen,
  History,
  Map,
  Play,
  Plus,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { PageIntro } from "@/components/guide/page-intro";

type HubPlan = {
  id: string;
  name: string;
  isActive?: boolean;
  lastSessionAt?: string | null;
  days?: { id: string }[];
};

/**
 * Full training hub — Krafttraining features preserved + Cardio as extension.
 * Muscle recovery stays based on strength sessions only.
 * Streak/recovery come from the home cache (already loaded at boot/enrich).
 */
export default function WorkoutsHubPage() {
  const router = useRouter();
  const [activeCleared, setActiveCleared] = useState(false);
  const [home, setHome] = useState<HomeDataPayload | null>(() => {
    const cached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
      allowStale: true,
    });
    // Seed Training caches from Home bootstrap — paint without waiting on hub fetches.
    if (cached) {
      if (
        cached.recovery?.muscles?.length &&
        !getCached("workouts-recovery", { allowStale: true })
      ) {
        setCached(
          "workouts-recovery",
          {
            recovery: cached.recovery.muscles,
            highlights: cached.recovery.highlights ?? [],
          },
          90_000
        );
      }
      if (
        cached.activeSession?.id &&
        !getCached(WORKOUT_ACTIVE_CACHE_KEY, { allowStale: true })
      ) {
        setCached(
          WORKOUT_ACTIVE_CACHE_KEY,
          { session: cached.activeSession },
          90_000
        );
      }
    }
    return cached;
  });
  const fetchOpts = { revalidateOnMount: false, staleRatio: 0.95 } as const;

  const { data: sessionData } = useCachedFetch<{
    session: { id: string; name?: string } | null;
  }>("workouts-active", "/api/workouts/sessions?active=1", 90_000, 6_000, fetchOpts);
  const { data: plansData } = useCachedFetch<{
    plans: HubPlan[];
  }>("workouts-my-plans-hub", "/api/workouts/plans", 120_000, 6_000, fetchOpts);
  const { data: recoveryData } = useCachedFetch<{
    recovery: MuscleRecovery[];
    highlights?: string[];
  }>("workouts-recovery", "/api/workouts/recovery", 90_000, 6_000, fetchOpts);

  useEffect(() => {
    const onHome = (e: Event) => {
      const detail = (e as CustomEvent<HomeDataPayload>).detail;
      if (detail) setHome(detail);
    };
    window.addEventListener(HOME_DATA_EVENT, onHome);
    return () => window.removeEventListener(HOME_DATA_EVENT, onHome);
  }, []);

  useEffect(() => {
    const onActive = () => {
      const cached = getCached<{ session: { id: string } | null }>(
        WORKOUT_ACTIVE_CACHE_KEY,
        { allowStale: true }
      );
      const homeCached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
        allowStale: true,
      });
      if (homeCached) setHome(homeCached);
      const hasSession = Boolean(cached?.session?.id ?? homeCached?.activeSession?.id);
      setActiveCleared(!hasSession);
    };
    window.addEventListener(WORKOUT_ACTIVE_EVENT, onActive);
    return () => window.removeEventListener(WORKOUT_ACTIVE_EVENT, onActive);
  }, []);

  useEffect(() => {
    if (sessionData?.session?.id) setActiveCleared(false);
  }, [sessionData?.session?.id]);

  const activeSession = activeCleared
    ? null
    : sessionData?.session ?? home?.activeSession ?? null;
  const plans = plansData?.plans ?? [];
  const lastPlan = plans.find((p) => p.lastSessionAt);
  const lastPlanLabel = lastPlan
    ? `${lastPlan.name} · ${new Date(lastPlan.lastSessionAt!).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })}`
    : plans.length > 0
      ? `${plans.length} ${plans.length === 1 ? "Plan" : "Pläne"}`
      : "Erstelle deinen ersten Plan";

  const streak =
    home?.nutritionStreak?.currentDays ??
    home?.trainingStreak?.currentDays ??
    home?.streak?.currentDays ??
    0;
  const weekWorkouts = home?.weeklyReport?.workouts ?? home?.activityWeek?.count ?? 0;
  const activePlan = plans.find((p) => p.isActive) ?? plans[0];
  const weekGoal = activePlan?.days?.length ?? 0;
  const recoveryMuscles = filterDisplayMuscles(
    (recoveryData?.recovery?.length
      ? recoveryData.recovery
      : (home?.recovery?.muscles ?? [])) as MuscleRecovery[]
  );

  return (
    <PageShell className="space-y-4 pb-24" bottomNav={false}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Training
          </h1>
          <p className="mt-1 text-sm text-zinc-500 tabular-nums">
            {weekWorkouts}
            {weekGoal > 0 ? ` / ${weekGoal}` : ""} Workouts diese Woche
            {streak > 0 ? ` · 🔥 ${streak} Tage` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-11 rounded-xl border-zinc-200 bg-white p-0 text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Kalender"
            onClick={() => router.push("/workouts/calendar")}
          >
            <Calendar className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            className="h-11 w-11 rounded-xl p-0"
            aria-label="Plan erstellen"
            onClick={() => router.push("/workouts/create")}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <PageIntro pageId="workouts" />

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {[
          { href: "/workouts/my-plans", label: "Trainingsplan" },
          { href: "/workouts/exercises", label: "Übungen" },
          { href: "/workouts/journey", label: "Statistiken" },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            scroll={false}
            className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-700 shadow-sm active:bg-zinc-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeSession ? (
        <section className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 space-y-3 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/80 dark:shadow-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Heutiges Training
          </p>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white leading-tight">
            {sessionData?.session?.name ?? "Training"}
          </h2>
          <Button
            className="h-14 w-full rounded-2xl text-base font-semibold"
            onClick={() => router.push(`/workouts/live/${activeSession.id}`)}
          >
            <Play className="mr-2 h-5 w-5 fill-current" />
            Fortsetzen
          </Button>
        </section>
      ) : (
        <NextWorkoutHero
          home={home}
          hasPlans={plans.length > 0 || Boolean(home?.nextWorkout?.dayId)}
        />
      )}

      <TrainingWeekStrip />

      <MuscleRecoveryPanel
        muscles={recoveryMuscles}
        variant="section"
        title="Regeneration"
      />

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Vorgefertigte Pläne
        </h2>
        <TrainingChoiceCard
          href="/workouts/catalog"
          title="Plan-Bibliothek"
          description="Push/Pull · Ganzkörper · Muskelaufbau"
          icon={BookOpen}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
        />
      </section>

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Start
        </h2>
        <TrainingChoiceCard
          href="/workouts/my-plans"
          title="Meine Pläne"
          description="Eigene Pläne · Schnell starten"
          icon={FolderOpen}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200"
          meta={lastPlanLabel}
        />
        <TrainingChoiceCard
          href="/workouts/quick"
          title="Quick Workout"
          description="Übungen wählen · Sofort starten"
          icon={Zap}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200"
        />
      </section>

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Überblick
        </h2>
        <TrainingChoiceCard
          href="/workouts/history"
          title="History"
          description="Kraft & Cardio im Überblick"
          icon={History}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
        />
        <TrainingChoiceCard
          href="/workouts/records"
          title="Records"
          description="Persönliche Bestleistungen"
          icon={Trophy}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
        />
      </section>

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          Mehr
        </h2>
        <TrainingChoiceCard
          href="/workouts/generator"
          title="KI Plan-Generator"
          description="Ziel, Tage, Equipment → persönlicher Plan"
          icon={Sparkles}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
        />
        <TrainingChoiceCard
          href="/workouts/cardio"
          title="Cardio"
          description="Laufen, Rad, HIIT & mehr"
          icon={Flame}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
          meta="Kalorien tracken"
        />
        <TrainingChoiceCard
          href="/workouts/exercises"
          title="Übungen"
          description="Suche · Muskelgruppen · Favoriten"
          icon={Dumbbell}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
        />
        <TrainingChoiceCard
          href="/workouts/journey"
          title="Historie & Journey"
          description="Kalender · Streak · Volumen"
          icon={Map}
          iconClassName="bg-zinc-100 text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-300"
          meta={
            streak > 0
              ? `${streak} Tage Streak${weekWorkouts > 0 ? ` · ${weekWorkouts} diese Woche` : ""}`
              : weekWorkouts > 0
                ? `${weekWorkouts} Trainings diese Woche`
                : "Noch keine Sessions"
          }
        />
      </section>
    </PageShell>
  );
}
