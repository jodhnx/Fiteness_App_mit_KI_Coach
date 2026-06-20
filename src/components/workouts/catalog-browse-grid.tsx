"use client";

import { memo } from "react";
import Link from "next/link";
import { PLAN_CATALOG, GOAL_LABELS } from "@/lib/plan-catalog";
import { cn } from "@/lib/utils";
import { Dumbbell, ChevronRight } from "lucide-react";

const GOAL_FILTERS = [
  { id: "ALL", label: "Alle" },
  { id: "MUSCLE_GAIN", label: "Muskelaufbau" },
  { id: "FAT_LOSS", label: "Fettverlust" },
  { id: "STRENGTH_GAIN", label: "Kraft" },
  { id: "GENERAL_FITNESS", label: "Fitness" },
  { id: "RECOMP", label: "Athletik" },
] as const;

type GoalFilter = (typeof GOAL_FILTERS)[number]["id"];

export const CatalogBrowseGrid = memo(function CatalogBrowseGrid({
  goalFilter,
  onGoalFilter,
}: {
  goalFilter: GoalFilter;
  onGoalFilter: (g: GoalFilter) => void;
}) {
  const plans =
    goalFilter === "ALL"
      ? PLAN_CATALOG
      : PLAN_CATALOG.filter((p) => p.goal === goalFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Vorgefertigte Pläne</h2>
        <span className="text-xs text-zinc-500">{plans.length} Pläne</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {GOAL_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onGoalFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
              goalFilter === f.id
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "bg-zinc-800 text-zinc-400 border border-transparent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((plan) => (
          <Link
            key={plan.catalogKey}
            href={`/workouts/catalog/${plan.catalogKey}`}
            prefetch
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 active:scale-[0.99] transition-transform hover:border-cyan-500/30"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white text-sm">{plan.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{plan.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                    {GOAL_LABELS[plan.goal]}
                  </span>
                  <span className="text-[10px] rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                    {plan.daysPerWeek}× / Woche
                  </span>
                  <span className="text-[10px] rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                    {plan.durationMinutes} min
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

export type { GoalFilter };
