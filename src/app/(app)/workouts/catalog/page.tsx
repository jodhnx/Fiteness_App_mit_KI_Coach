"use client";

import Link from "next/link";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { CATALOG_PRESETS } from "@/lib/catalog-presets";
import { ChevronRight } from "lucide-react";

export default function PlanCatalogPage() {
  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white">Vorgefertigte Pläne</h1>
        <p className="text-zinc-400 text-sm mt-1">Plan wählen und sofort loslegen</p>
      </div>

      <div className="space-y-2">
        {CATALOG_PRESETS.map((preset) => (
          <Link
            key={preset.catalogKey}
            href={`/workouts/catalog/${preset.catalogKey}`}
            prefetch
            className="flex items-center gap-4 w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all active:scale-[0.98] hover:border-cyan-500/30"
          >
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-white">{preset.label}</p>
              <p className="text-sm text-zinc-400">{preset.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
