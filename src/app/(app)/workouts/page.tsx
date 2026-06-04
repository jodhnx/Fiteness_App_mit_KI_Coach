"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { HubCard } from "@/components/ui/hub-card";
import { Button } from "@/components/ui/button";
import {
  Dumbbell,
  Play,
  History,
  Trophy,
  BookOpen,
  FolderOpen,
  Plus,
  Flame,
} from "lucide-react";

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
  const { data: plans } = useCachedFetch<{ plans: { id: string; name: string }[] }>(
    "workouts-my-plans-hub",
    "/api/workouts/plans",
    120_000,
    6_000,
    fetchOpts
  );
  const { data: analytics } = useCachedFetch<{
    trainingStreak: { currentDays: number } | null;
  }>("workouts-analytics-hub", "/api/workouts/analytics", 120_000, 6_000, fetchOpts);

  const activeSession = sessionData?.session ?? null;
  const planCount = plans?.plans?.length ?? 0;
  const streak = analytics?.trainingStreak?.currentDays ?? 0;

  async function continueWorkout() {
    if (activeSession?.id) {
      router.push(`/workouts/live/${activeSession.id}`);
    }
  }

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto">
      <PageHeader
        title="Training"
        subtitle="Einfach starten · Pläne · Rekorde"
        action={
          streak > 0 ? (
            <span className="flex items-center gap-1 text-sm text-orange-400 font-medium">
              <Flame className="h-4 w-4" />
              {streak} Tage
            </span>
          ) : undefined
        }
      />

      {activeSession && (
        <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs text-cyan-300/80 uppercase tracking-wide">Läuft gerade</p>
          <p className="text-lg font-bold text-white mt-1">
            {activeSession.name ?? "Training"}
          </p>
          <Button className="w-full mt-3 h-12 text-base" onClick={continueWorkout}>
            <Play className="h-5 w-5 mr-2" />
            Fortsetzen
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <HubCard
          href="/workouts/my-plans"
          title="Meine Pläne"
          description={
            planCount > 0 ? `${planCount} Pläne` : "Erstelle deinen ersten Plan"
          }
          icon={FolderOpen}
          iconClassName="text-violet-400"
        />
        <HubCard
          href="/workouts/catalog"
          title="Vorgefertigte Pläne"
          description="Push/Pull, Ganzkörper & mehr"
          icon={BookOpen}
          iconClassName="text-cyan-400"
        />
        <HubCard
          href={activeSession ? `/workouts/live/${activeSession.id}` : "/workouts/my-plans"}
          title="Aktives Training"
          description={
            activeSession ? "Workout fortsetzen" : "Plan wählen und starten"
          }
          icon={Play}
          iconClassName="text-emerald-400"
          badge={activeSession ? "Live" : undefined}
        />
        <HubCard
          href="/workouts/history"
          title="Historie"
          description="Vergangene Workouts"
          icon={History}
          iconClassName="text-zinc-300"
        />
        <HubCard
          href="/workouts/analytics"
          title="Gym Check-in"
          description="Kalender · Streak · Trainingsquote"
          icon={Flame}
          iconClassName="text-orange-400"
        />
        <HubCard
          href="/workouts/records"
          title="Rekorde"
          description="Personal Records · Kraftverlauf"
          icon={Trophy}
          iconClassName="text-amber-400"
        />
      </div>

      <Link href="/workouts/create" prefetch className="block">
        <Button className="w-full h-14 text-base rounded-xl gap-2">
          <Plus className="h-5 w-5" />
          Neuen Plan erstellen
        </Button>
      </Link>

      <HubCard
        href="/workouts/exercises/pick"
        title="Übungen durchsuchen"
        description="Bibliothek · Filter · Details"
        icon={Dumbbell}
      />
    </div>
  );
}
