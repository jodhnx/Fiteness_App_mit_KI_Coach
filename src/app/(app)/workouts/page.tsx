"use client";

import { useEffect, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useRouter } from "next/navigation";
import { WORKOUT_ACTIVE_EVENT } from "@/lib/workout-cache-sync";
import { HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { PageShell } from "@/components/layout/page-shell";
import { TrainingChoiceCard } from "@/components/workout/training-choice-card";
import { MuscleRecoveryPanel } from "@/components/workout/muscle-recovery-panel";
import { Button } from "@/components/ui/button";
import { filterDisplayMuscles } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import {
  BookOpen,
  Dumbbell,
  FolderOpen,
  Map,
  Play,
  Trophy,
  Zap,
} from "lucide-react";

export default function WorkoutsHubPage() {
  const router = useRouter();
  const [activeCleared, setActiveCleared] = useState(false);
  const fetchOpts = { revalidateOnMount: false, staleRatio: 0.95 } as const;

  const { data: sessionData } = useCachedFetch<{ session: { id: string; name?: string } | null }>(
    "workouts-active",
    "/api/workouts/sessions?active=1",
    90_000,
    6_000,
    fetchOpts
  );
  const { data: plansData } = useCachedFetch<{
    plans: { id: string; name: string; lastSessionAt?: string | null }[];
  }>("workouts-my-plans-hub", "/api/workouts/plans", 120_000, 6_000, fetchOpts);
  const { data: journeyData } = useCachedFetch<{
    journey: { streak: { currentDays: number }; stats30d: { sessions: number } };
  }>("workouts-journey-hub", "/api/workouts/journey", 120_000, 6_000, fetchOpts);
  const { data: recoveryData } = useCachedFetch<{
    recovery: MuscleRecovery[];
  }>("workouts-recovery-hub", "/api/workouts/recovery", 120_000, 6_000, fetchOpts);

  useEffect(() => {
    const clear = () => setActiveCleared(true);
    window.addEventListener(WORKOUT_ACTIVE_EVENT, clear);
    window.addEventListener(HOME_DATA_EVENT, clear);
    return () => {
      window.removeEventListener(WORKOUT_ACTIVE_EVENT, clear);
      window.removeEventListener(HOME_DATA_EVENT, clear);
    };
  }, []);

  useEffect(() => {
    if (sessionData?.session?.id) setActiveCleared(false);
  }, [sessionData?.session?.id]);

  const activeSession = activeCleared ? null : sessionData?.session ?? null;
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

  const streak = journeyData?.journey?.streak?.currentDays ?? 0;
  const sessions30 = journeyData?.journey?.stats30d?.sessions ?? 0;
  const recoveryMuscles = filterDisplayMuscles(recoveryData?.recovery ?? []);

  return (
    <PageShell className="-mt-1 pb-24" bottomNav={false}>
      {activeSession && (
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-4 mb-1">
          <p className="text-xs text-cyan-300/80 uppercase tracking-wide font-medium">Läuft gerade</p>
          <p className="text-lg font-bold text-white mt-1">{activeSession.name ?? "Training"}</p>
          <Button
            className="w-full mt-3 h-14 text-base rounded-2xl"
            onClick={() => router.push(`/workouts/live/${activeSession.id}`)}
          >
            <Play className="h-5 w-5 mr-2" />
            Fortsetzen
          </Button>
        </div>
      )}

      <TrainingChoiceCard
        href="/workouts/my-plans"
        title="Meine Pläne"
        description="Eigene Trainingspläne · Schnell starten"
        icon={FolderOpen}
        iconClassName="bg-violet-500/15 text-violet-400"
        meta={lastPlanLabel}
      />
      <TrainingChoiceCard
        href="/workouts/catalog"
        title="Vorgefertigte Pläne"
        description="Push/Pull · Ober/Unter · Ganzkörper · Anfänger · Muskelaufbau"
        icon={BookOpen}
        iconClassName="bg-cyan-500/15 text-cyan-400"
      />
      <TrainingChoiceCard
        href="/workouts/quick"
        title="Quick Workout"
        description="Sofort starten · Übungen auswählen · Kein Plan nötig"
        icon={Zap}
        iconClassName="bg-amber-500/15 text-amber-400"
      />
      <TrainingChoiceCard
        href="/workouts/journey"
        title="Fitness Journey"
        description="Historie · Kalender · Check-Ins · Streak · Volumen"
        icon={Map}
        iconClassName="bg-emerald-500/15 text-emerald-400"
        meta={
          streak > 0
            ? `${streak} Tage Streak · ${sessions30} Trainings (30T)`
            : `${sessions30} Trainings in 30 Tagen`
        }
      />
      <TrainingChoiceCard
        href="/workouts/records"
        title="Rekorde"
        description="Bankdrücken · Kniebeuge · Kreuzheben · Highlights"
        icon={Trophy}
        iconClassName="bg-yellow-500/15 text-yellow-400"
      />
      <TrainingChoiceCard
        href="/workouts/exercises"
        title="Übungen"
        description="Exercise Hub · Suche · Muskelgruppen · Favoriten"
        icon={Dumbbell}
        iconClassName="bg-rose-500/15 text-rose-400"
      />

      <MuscleRecoveryPanel muscles={recoveryMuscles} variant="section" />
    </PageShell>
  );
}
