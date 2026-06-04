"use client";

import Link from "next/link";
import { Target, ChevronRight } from "lucide-react";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeChallengesRow({
  challenges,
}: {
  challenges: NonNullable<HomeDataPayload["challenges"]>;
}) {
  if (challenges.length === 0) return null;

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Target className="h-4 w-4 text-cyan-400" />
          Aktuelle Challenges
        </h2>
        <Link href="/erfolge" prefetch className="text-xs text-zinc-500 flex items-center gap-0.5">
          Alle <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <ul className="space-y-3">
        {challenges.map((c) => {
          const pct =
            c.target > 0 ? Math.min(100, Math.round((c.progress / c.target) * 100)) : 0;
          return (
            <li key={c.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-200 font-medium truncate pr-2">{c.title}</span>
                <span className="text-zinc-500 tabular-nums shrink-0 text-xs">
                  {c.progress}/{c.target}
                </span>
              </div>
              <MacroProgressBar consumed={pct} target={100} className="h-1.5" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
