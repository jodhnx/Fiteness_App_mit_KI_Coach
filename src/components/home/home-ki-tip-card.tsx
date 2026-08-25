"use client";

import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import type { HomeCoach } from "@/lib/home-defaults";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";

type Props = {
  coach: HomeCoach;
  intelligence?: DailyFitnessIntelligence | null;
};

/** Compact Home tip — uses intelligence when available, no extra network. */
export function HomeKiTipCard({ coach, intelligence }: Props) {
  const primary = intelligence?.primary;
  const tip = primary
    ? `${primary.title}: ${primary.description}`
    : coach.tips[0]?.message ?? coach.summary;
  const href = primary?.action?.href ?? coach.tips[0]?.actionHref ?? "/coach";

  if (!tip) return null;

  return (
    <Link
      href={href}
      prefetch
      className="block rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 active:opacity-95 min-h-[44px]"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300 flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        Coach heute
      </p>
      <p className="text-sm text-zinc-200 leading-relaxed line-clamp-3">{tip}</p>
      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-cyan-400/90">
        Weiter
        <ChevronRight className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}
