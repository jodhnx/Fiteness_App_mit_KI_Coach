"use client";

import Link from "next/link";
import { Sparkles, ChevronRight, Dumbbell, Apple, HeartPulse, TrendingUp } from "lucide-react";
import type { HomeCoach } from "@/lib/home-defaults";

const GROUPS: { key: string; label: string; icon: typeof Dumbbell; types: string[] }[] = [
  { key: "training", label: "Training", icon: Dumbbell, types: ["training", "pr", "activity"] },
  { key: "nutrition", label: "Ernährung", icon: Apple, types: ["nutrition", "goal", "steps"] },
  { key: "recovery", label: "Regeneration", icon: HeartPulse, types: ["recovery", "sleep"] },
  {
    key: "progress",
    label: "Fortschritt",
    icon: TrendingUp,
    types: ["weekly", "combined", "challenge"],
  },
];

export function HomeCoachRecommendations({ coach }: { coach: HomeCoach }) {
  const tips = coach.tips;
  if (tips.length === 0 && !coach.summary) return null;

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: tips.filter((t) => g.types.includes(t.type)).slice(0, 2),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-zinc-900/90 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          KI Empfehlungen
        </h2>
        <Link
          href="/coach"
          prefetch
          className="text-xs text-violet-300 flex items-center gap-0.5"
        >
          Coach <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {coach.summary && grouped.length === 0 && (
        <p className="text-sm text-zinc-300 mb-3">{coach.summary}</p>
      )}
      <div className="space-y-3">
        {grouped.map((g) => (
          <div key={g.key}>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500 flex items-center gap-1 mb-1.5">
              <g.icon className="h-3 w-3" />
              {g.label}
            </p>
            <ul className="space-y-1.5">
              {g.items.map((tip, i) => (
                <li key={i}>
                  {tip.actionHref ? (
                    <Link
                      href={tip.actionHref}
                      prefetch
                      className="flex items-start justify-between gap-2 rounded-lg bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 active:bg-zinc-800"
                    >
                      <span>{tip.message}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50 mt-0.5" />
                    </Link>
                  ) : (
                    <p className="text-sm text-zinc-400 px-1">{tip.message}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
