"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";

const MACROS = [
  { key: "protein" as const, label: "Protein", emoji: "🥩", bar: "bg-rose-400", priority: true },
  { key: "carbs" as const, label: "Kohlenhydrate", emoji: "🍚", bar: "bg-amber-400", priority: false },
  { key: "fat" as const, label: "Fett", emoji: "🥑", bar: "bg-violet-400", priority: false },
] as const;

export const HomeMacroOverviewCard = memo(function HomeMacroOverviewCard({
  nutrition,
}: {
  nutrition: NutritionDashboardPayload;
}) {
  if (!hasNutritionTargets(nutrition)) return null;

  const { consumed, targets, remaining } = nutrition;

  return (
    <Link
      href="/nutrition"
      prefetch
      className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2.5 active:scale-[0.995] transition-transform"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 px-0.5">
        Makros heute
      </p>
      {MACROS.map(({ key, label, emoji, bar, priority }) => {
        const c = consumed[`${key}G` as "proteinG" | "carbsG" | "fatG"];
        const t = targets[`${key}G` as "proteinG" | "carbsG" | "fatG"];
        const rem = remaining[`${key}G` as "proteinG" | "carbsG" | "fatG"];
        const pct = t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0;
        return (
          <div
            key={key}
            className={cn(
              "rounded-xl px-3 py-2.5 border",
              priority ? "border-rose-500/20 bg-rose-950/15" : "border-zinc-800/70 bg-zinc-950/40"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={cn("text-xs", priority ? "text-rose-200 font-medium" : "text-zinc-400")}>
                <span className="mr-1">{emoji}</span>
                {label}
                {priority && key === "protein" && (
                  <span className="ml-1.5 text-rose-400 tabular-nums">
                    · {Math.max(0, Math.round(rem))}g übrig
                  </span>
                )}
              </span>
              <span className="text-xs text-zinc-500 tabular-nums">
                {Math.round(c)} / {Math.round(t)}g
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-300", bar)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </Link>
  );
});
