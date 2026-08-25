"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";

export function HomeIntelligenceCard({
  intelligence,
}: {
  intelligence: DailyFitnessIntelligence | null | undefined;
}) {
  if (!intelligence?.primary) return null;

  const { primary, secondary, allGood } = intelligence;

  return (
    <div
      className={
        allGood
          ? "rounded-xl border border-emerald-500/15 bg-emerald-950/15 px-3 py-2.5"
          : "rounded-xl border border-cyan-500/15 bg-cyan-950/20 px-3 py-2.5"
      }
    >
      <p className="text-[11px] font-medium text-zinc-500 mb-0.5">
        {allGood ? "Status" : "Priorität heute"}
      </p>
      <p className="text-sm font-semibold text-zinc-100 leading-snug">
        {primary.title}: {primary.description}
      </p>
      {primary.action && (
        <Link
          href={primary.action.href}
          className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-cyan-300"
        >
          {primary.action.label}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
      {secondary.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
          {secondary.map((s) => (
            <li key={s.id} className="text-xs text-zinc-400 leading-relaxed">
              {s.title}: {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
