"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";

type Tip = { type: string; message: string; priority: string };

type Props = {
  tips: Tip[];
  summary?: string;
};

export const NutritionCoachCard = memo(function NutritionCoachCard({
  tips,
  summary,
}: Props) {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-zinc-900/80 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-violet-400" />
        <h3 className="font-semibold text-white">KI Ernährungs-Coach</h3>
      </div>
      {summary && <p className="text-sm text-zinc-300 mb-3">{summary}</p>}
      <ul className="space-y-2">
        {tips.map((t, i) => (
          <li
            key={i}
            className={`text-sm rounded-lg px-3 py-2 ${
              t.priority === "high"
                ? "bg-violet-500/10 text-violet-100 border border-violet-500/20"
                : "bg-zinc-800/50 text-zinc-400"
            }`}
          >
            {t.message}
          </li>
        ))}
      </ul>
    </div>
  );
});
