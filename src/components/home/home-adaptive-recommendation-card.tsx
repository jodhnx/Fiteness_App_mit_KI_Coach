"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import type { AdaptiveRecommendations } from "@/lib/intelligence/recommendations/types";

export function HomeAdaptiveRecommendationCard({
  recommendations,
}: {
  recommendations: AdaptiveRecommendations | null | undefined;
}) {
  if (!recommendations?.primary) return null;

  const { primary, allOnTrack } = recommendations;

  return (
    <div
      className={
        allOnTrack
          ? "mt-3 rounded-xl border border-emerald-500/15 bg-emerald-950/15 px-3 py-2.5"
          : "mt-3 rounded-xl border border-violet-500/15 bg-violet-950/20 px-3 py-2.5"
      }
    >
      <p className="text-[11px] font-medium text-zinc-500 mb-0.5 flex items-center gap-1">
        <Sparkles className="h-3 w-3" />
        {allOnTrack ? "Empfehlung" : "Nächster Schritt"}
      </p>
      <p className="text-sm text-zinc-100 leading-snug">{primary.explanation}</p>
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
  );
}
