"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { TrainingChoiceCard } from "@/components/workout/training-choice-card";
import { Button } from "@/components/ui/button";
import { BookOpen, FolderOpen, Play, Zap } from "lucide-react";

export default function WorkoutsHubPage() {
  const router = useRouter();
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

  const activeSession = sessionData?.session ?? null;
  const plans = plansData?.plans ?? [];
  const lastPlan = plans.find((p) => p.lastSessionAt);
  const lastPlanLabel = lastPlan
    ? `${lastPlan.name} · ${new Date(lastPlan.lastSessionAt!).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })}`
    : plans.length > 0
      ? `${plans.length} ${plans.length === 1 ? "Plan" : "Pläne"} bereit`
      : "Erstelle deinen ersten Plan";

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <PageHeader title="Training" subtitle="Wähle, wie du trainieren willst" />

      {activeSession && (
        <div className="rounded-3xl border border-cyan-500/30 bg-cyan-500/10 p-4">
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

      <div className="space-y-3">
        <TrainingChoiceCard
          href="/workouts/my-plans"
          title="Meine Pläne"
          description="Eigene Workouts · Schnell starten"
          icon={FolderOpen}
          iconClassName="bg-violet-500/15 text-violet-400"
          meta={lastPlanLabel}
        />
        <TrainingChoiceCard
          href="/workouts/catalog"
          title="Vorgefertigte Pläne"
          description="Push/Pull, Ganzkörper, Anfänger & mehr"
          icon={BookOpen}
          iconClassName="bg-cyan-500/15 text-cyan-400"
        />
        <TrainingChoiceCard
          href="/workouts/quick"
          title="Quick Workout"
          description="Sofort starten · Übungen spontan wählen · Kein Plan nötig"
          icon={Zap}
          iconClassName="bg-amber-500/15 text-amber-400"
        />
      </div>
    </div>
  );
}
