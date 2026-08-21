"use client";

import { useEffect, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useRouter } from "next/navigation";
import { WORKOUT_ACTIVE_EVENT } from "@/lib/workout-cache-sync";
import { HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { PageShell } from "@/components/layout/page-shell";
import { TrainingChoiceCard } from "@/components/workout/training-choice-card";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Flame,
  History,
  Play,
  Zap,
} from "lucide-react";
import { PageIntro } from "@/components/guide/page-intro";

export default function WorkoutsHubPage() {
  const router = useRouter();
  const [activeCleared, setActiveCleared] = useState(false);
  const fetchOpts = { revalidateOnMount: false, staleRatio: 0.95 } as const;

  const { data: sessionData } = useCachedFetch<{
    session: { id: string; name?: string } | null;
  }>("workouts-active", "/api/workouts/sessions?active=1", 90_000, 6_000, fetchOpts);
  const { data: plansData } = useCachedFetch<{
    plans: { id: string; name: string; lastSessionAt?: string | null }[];
  }>("workouts-my-plans-hub", "/api/workouts/plans", 120_000, 6_000, fetchOpts);

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

  return (
    <PageShell title="Training" className="space-y-4 pb-24" bottomNav={false}>
      <PageIntro pageId="workouts" />

      {activeSession && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300/80">
            Läuft gerade
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {activeSession.name ?? "Training"}
          </p>
          <Button
            className="mt-3 h-12 w-full rounded-2xl text-base"
            onClick={() => router.push(`/workouts/live/${activeSession.id}`)}
          >
            <Play className="mr-2 h-5 w-5" />
            Fortsetzen
          </Button>
        </div>
      )}

      <section className="space-y-2.5">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
          Training
        </h2>
        <TrainingChoiceCard
          href="/workouts/my-plans"
          title="Meine Pläne"
          description="Pläne verwalten und starten"
          icon={FolderOpen}
          iconClassName="bg-violet-500/15 text-violet-400"
          meta={lastPlanLabel}
        />
        <TrainingChoiceCard
          href="/workouts/cardio"
          title="Cardio"
          description="Laufen, Rad, HIIT & mehr"
          icon={Flame}
          iconClassName="bg-orange-500/15 text-orange-400"
          meta="Kalorien tracken"
        />
        <TrainingChoiceCard
          href="/workouts/quick"
          title="Workout starten"
          description="Sofortiges Krafttraining"
          icon={Zap}
          iconClassName="bg-amber-500/15 text-amber-400"
          featured
        />
        <TrainingChoiceCard
          href="/workouts/history"
          title="Trainingshistorie"
          description="Kraft & Cardio im Überblick"
          icon={History}
          iconClassName="bg-zinc-500/20 text-zinc-300"
        />
      </section>
    </PageShell>
  );
}
