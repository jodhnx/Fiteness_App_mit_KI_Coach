"use client";

import { memo } from "react";
import Link from "next/link";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { cn } from "@/lib/utils";
import { Dumbbell, ChevronRight } from "lucide-react";

export type QuickPlanFilter =
  | "ALL"
  | "PUSH_PULL_LEGS"
  | "UPPER_LOWER"
  | "FULL_BODY"
  | "ARNOLD_SPLIT"
  | "HYPERTROPHY"
  | "STRENGTH"
  | "BEGINNER"
  | "HOME";

export const QUICK_PLAN_FILTERS: {
  id: QuickPlanFilter;
  label: string;
  keys: string[];
}[] = [
  { id: "ALL", label: "Alle", keys: [] },
  { id: "PUSH_PULL_LEGS", label: "Push Pull Legs", keys: ["PUSH_PULL_LEGS", "SCIENCE_PPL"] },
  { id: "UPPER_LOWER", label: "Upper Lower", keys: ["UPPER_LOWER", "SCIENCE_UPPER_LOWER"] },
  { id: "FULL_BODY", label: "Ganzkörper", keys: ["FULL_BODY", "SCIENCE_FULL_BODY"] },
  { id: "ARNOLD_SPLIT", label: "Arnold Split", keys: ["ARNOLD_SPLIT"] },
  { id: "HYPERTROPHY", label: "Hypertrophie", keys: ["HYPERTROPHY", "HYPERTROPHY_FOCUS"] },
  { id: "STRENGTH", label: "Krafttraining", keys: ["STRENGTH", "STRENGTH_FOCUS", "POWERLIFTING"] },
  { id: "BEGINNER", label: "Anfänger", keys: ["BEGINNER", "BEGINNER_GYM", "HOME_BEGINNER"] },
  { id: "HOME", label: "Home Workout", keys: ["HOME_DUMBBELL", "HOME_BEGINNER", "CALISTHENICS"] },
];

export const CatalogBrowseGrid = memo(function CatalogBrowseGrid({
  quickFilter,
  onQuickFilter,
}: {
  quickFilter: QuickPlanFilter;
  onQuickFilter: (f: QuickPlanFilter) => void;
}) {
  const filterDef = QUICK_PLAN_FILTERS.find((f) => f.id === quickFilter) ?? QUICK_PLAN_FILTERS[0];

  const plans =
    quickFilter === "ALL"
      ? PLAN_CATALOG
      : PLAN_CATALOG.filter((p) => filterDef.keys.includes(p.catalogKey));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Vorgefertigte Standardpläne</h2>
        <span className="text-xs text-zinc-500">{plans.length} Pläne</span>
      </div>
      <p className="text-xs text-zinc-500">Schnellfilter — direkt einen Standardplan öffnen</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {QUICK_PLAN_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onQuickFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap",
              quickFilter === f.id
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
