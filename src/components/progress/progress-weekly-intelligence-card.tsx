"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";
import type { AdaptiveRecommendations } from "@/lib/intelligence/recommendations/types";

export function ProgressWeeklyIntelligenceCard({
  intelligence,
  adaptiveRecommendations,
}: {
  intelligence: WeeklyFitnessIntelligence | null | undefined;
  adaptiveRecommendations?: AdaptiveRecommendations | null;
}) {
  if (!intelligence) return null;

  const { primary, secondary, achievements } = intelligence;
  const adaptivePrimary = adaptiveRecommendations?.primary;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-violet-400" />
          Wochen-Intelligence · {intelligence.weekLabel}
        </h2>
      </div>

      {adaptivePrimary && (
        <div className="rounded-xl border border-violet-500/25 bg-violet-950/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
            Empfehlung
          </p>
          <p className="text-sm text-zinc-100 leading-snug">{adaptivePrimary.explanation}</p>
          {adaptivePrimary.evidence[0] && (
            <p className="text-[11px] text-zinc-500 mt-1">{adaptivePrimary.evidence[0]}</p>
          )}
          {adaptivePrimary.action && (
            <Link
              href={adaptivePrimary.action.href}
              className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-violet-300"
            >
              {adaptivePrimary.action.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {primary && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-950/25 px-3 py-2.5">
          <p className="text-[11px] text-zinc-500">Priorität</p>
          <p className="text-sm text-zinc-100 mt-0.5">{primary.description}</p>
          {primary.action && (
            <Link
              href={primary.action.href}
              className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-violet-300"
            >
              {primary.action.label}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {secondary.length > 0 && (
        <ul className="space-y-1.5">
          {secondary.map((s) => (
            <li key={s.id} className="text-xs text-zinc-400 leading-relaxed">
              {s.description}
            </li>
          ))}
        </ul>
      )}

      {achievements.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
            Erfolge
          </p>
          <ul className="space-y-1">
            {achievements.slice(0, 3).map((a) => (
              <li key={a.id} className="text-xs text-emerald-300/90">
                {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.recommendations.length > 0 && !adaptivePrimary && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">
            Empfehlung
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">
            {intelligence.recommendations[0]?.description}
          </p>
        </div>
      )}
    </section>
  );
}
