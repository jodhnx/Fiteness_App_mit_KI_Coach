"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";

export function HomeWeeklyIntelligenceCard({
  intelligence,
}: {
  intelligence: WeeklyFitnessIntelligence | null | undefined;
}) {
  if (!intelligence?.primary) return null;

  return (
    <div className="mt-3 rounded-xl border border-violet-500/15 bg-violet-950/20 px-3 py-2.5">
      <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Woche</p>
      <p className="text-sm text-zinc-100 leading-snug">
        {intelligence.primary.description}
      </p>
      {intelligence.secondary[0] && (
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          {intelligence.secondary[0].description}
        </p>
      )}
      {intelligence.primary.action && (
        <Link
          href={intelligence.primary.action.href}
          className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-violet-300"
        >
          {intelligence.primary.action.label}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
