"use client";

import { memo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";
import type { AdaptiveRecommendations } from "@/lib/intelligence/recommendations/types";
import type { DailyActionPlan } from "@/lib/intelligence/daily-plan/types";
import { HomeDailyActionPlanCard } from "@/components/home/home-daily-action-plan-card";
import { HomeIntelligenceCard } from "@/components/home/home-intelligence-card";
import { HomeAdaptiveRecommendationCard } from "@/components/home/home-adaptive-recommendation-card";

type Props = {
  streakDays?: number;
  dailyActionPlan?: DailyActionPlan | null;
  intelligence?: DailyFitnessIntelligence | null;
  adaptiveRecommendations?: AdaptiveRecommendations | null;
};

/** Daily Action Plan first — clear answer to "what matters today?" */
export const HomeCoachBriefing = memo(function HomeCoachBriefing({
  dailyActionPlan,
  intelligence,
  adaptiveRecommendations,
}: Props) {
  const hasPlan = Boolean(dailyActionPlan?.primary);

  return (
    <div className="space-y-2.5">
      <div className="rounded-[1.125rem] border border-zinc-200/90 bg-white overflow-hidden shadow-sm dark:border-white/[0.07] dark:bg-[#1a1a21] dark:shadow-none">
        <div className="px-3.5 pt-3.5 pb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Heute wichtig
            </p>
            <p className="text-[13px] font-semibold text-zinc-900 dark:text-white mt-0.5">
              Nächster Schritt
            </p>
          </div>
          <span className="rounded-md bg-[var(--accent,#6d5dfe)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent,#6d5dfe)]">
            Heute
          </span>
        </div>

        <div className="px-3.5 pb-3">
          {hasPlan ? (
            <HomeDailyActionPlanCard plan={dailyActionPlan} />
          ) : (
            <>
              <HomeIntelligenceCard intelligence={intelligence} />
              <HomeAdaptiveRecommendationCard recommendations={adaptiveRecommendations} />
            </>
          )}
        </div>
      </div>

      <Link
        href="/coach"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.125rem] border border-[var(--ai-accent,#2dd4bf)]/45 bg-transparent px-4 text-[14px] font-semibold text-[var(--ai-accent,#2dd4bf)] active:opacity-90"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        <span>KI Coach öffnen</span>
      </Link>
    </div>
  );
});
