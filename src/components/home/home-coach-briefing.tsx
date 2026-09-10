"use client";

import { memo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
    <div className="rounded-[1.25rem] border border-white/[0.07] bg-zinc-900/40 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Heute wichtig</p>
          <p className="text-[11px] text-zinc-500">Nächster Schritt</p>
        </div>
      </div>

      <div className="mx-4 mb-3">
        {hasPlan ? (
          <HomeDailyActionPlanCard plan={dailyActionPlan} />
        ) : (
          <>
            <HomeIntelligenceCard intelligence={intelligence} />
            <HomeAdaptiveRecommendationCard recommendations={adaptiveRecommendations} />
          </>
        )}
      </div>

      <Link
        href="/coach"
        className="flex min-h-11 items-center justify-between px-4 py-2.5 border-t border-white/[0.05] text-xs font-medium text-zinc-500 hover:text-white transition-colors"
      >
        <span>KI Coach öffnen</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
});
