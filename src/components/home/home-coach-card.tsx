"use client";

import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import type { HomeCoach } from "@/lib/home-defaults";

export function HomeCoachCard({ coach }: { coach: HomeCoach }) {
  const tips = coach.tips.slice(0, 3);
  if (tips.length === 0 && !coach.summary) return null;

  return (
    <Link
      href="/coach"
      className="block rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 to-zinc-900/80 p-4 hover:border-violet-400/40 active:opacity-95"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          KI Coach
        </p>
        <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
      </div>
      <ul className="space-y-2">
        {(tips.length > 0 ? tips : [{ message: coach.summary, priority: "medium" }]).map(
          (tip, i) => (
            <li key={i} className="flex gap-2 text-sm text-zinc-200 leading-snug">
              <span className="text-violet-400 shrink-0 mt-0.5">•</span>
              <span>{tip.message}</span>
            </li>
          )
        )}
      </ul>
    </Link>
  );
}
