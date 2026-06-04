"use client";

import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  Dumbbell,
  Apple,
  HeartPulse,
  TrendingUp,
} from "lucide-react";

type Insight = {
  type: string;
  message: string;
  priority: string;
  actionHref?: string;
};

const GROUPS: {
  key: string;
  label: string;
  icon: typeof Dumbbell;
  types: string[];
}[] = [
  { key: "training", label: "Training", icon: Dumbbell, types: ["training", "pr", "activity"] },
  { key: "nutrition", label: "Ernährung", icon: Apple, types: ["nutrition", "goal", "steps"] },
  { key: "recovery", label: "Regeneration", icon: HeartPulse, types: ["recovery", "sleep"] },
  {
    key: "progress",
    label: "Fortschrittsanalyse",
    icon: TrendingUp,
    types: ["weekly", "combined", "challenge"],
  },
];

export function CoachRecommendations({
  summary,
  tips,
  loading,
}: {
  summary?: string;
  tips: Insight[];
  loading?: boolean;
}) {
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: tips.filter((t) => g.types.includes(t.type)).slice(0, 3),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="rounded-2xl border border-violet-500/20 bg-violet-950/25 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        Deine Empfehlungen
      </h2>

      {loading && !summary && grouped.length === 0 ? (
        <p className="text-sm text-zinc-500">Analysiere deine Daten…</p>
      ) : (
        <>
          {summary && <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>}
          {grouped.map((g) => (
            <div key={g.key}>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1.5 mb-2">
                <g.icon className="h-3.5 w-3.5" />
                {g.label}
              </p>
              <ul className="space-y-2">
                {g.items.map((tip, i) => (
                  <li key={i}>
                    {tip.actionHref ? (
                      <Link
                        href={tip.actionHref}
                        prefetch
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-3 text-sm leading-snug active:opacity-90 ${
                          tip.priority === "high"
                            ? "bg-violet-500/15 text-violet-50 border border-violet-500/25"
                            : "bg-zinc-800/70 text-zinc-300"
                        }`}
                      >
                        <span>{tip.message}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                      </Link>
                    ) : (
                      <p
                        className={`rounded-xl px-3 py-3 text-sm leading-snug ${
                          tip.priority === "high"
                            ? "bg-violet-500/10 text-violet-100"
                            : "bg-zinc-800/60 text-zinc-400"
                        }`}
                      >
                        {tip.message}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
