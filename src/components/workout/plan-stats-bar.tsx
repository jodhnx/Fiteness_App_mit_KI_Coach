"use client";

import { memo, useMemo } from "react";
import { Dumbbell, Clock, Layers, Trophy } from "lucide-react";
import { parsePlanSetTargets } from "@/lib/plan-exercise-sets";

type Exercise = {
  targetSets: number;
  targetReps: string;
  setTargets?: unknown;
};

type Props = {
  exercises: Exercise[];
  lastSessionAt?: string | null;
  lastVolumeKg?: number | null;
};

export const PlanStatsBar = memo(function PlanStatsBar({
  exercises,
  lastSessionAt,
  lastVolumeKg,
}: Props) {
  const stats = useMemo(() => {
    let totalSets = 0;
    for (const ex of exercises) {
      const sets = parsePlanSetTargets(ex.setTargets, ex.targetSets, ex.targetReps);
      totalSets += sets.length;
    }
    const exerciseCount = exercises.length;
    const estMinutes = Math.max(15, totalSets * 2 + exerciseCount * 2);
    return { exerciseCount, totalSets, estMinutes };
  }, [exercises]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatTile icon={Dumbbell} label="Übungen" value={String(stats.exerciseCount)} />
      <StatTile icon={Layers} label="Sätze" value={String(stats.totalSets)} />
      <StatTile icon={Clock} label="ca. Dauer" value={`${stats.estMinutes} min`} />
      <StatTile
        icon={Trophy}
        label="Letztes Mal"
        value={
          lastSessionAt
            ? new Date(lastSessionAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
              })
            : "—"
        }
        sub={lastVolumeKg != null ? `${Math.round(lastVolumeKg)} kg Vol.` : undefined}
      />
    </div>
  );
});

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-lg font-bold text-white tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 tabular-nums">{sub}</p>}
    </div>
  );
}
