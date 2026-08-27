"use client";

import { memo } from "react";
import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";
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
  streakDays = 0,
  dailyActionPlan,
  intelligence,
  adaptiveRecommendations,
}: Props) {
  const hasPlan = Boolean(dailyActionPlan?.primary);

  return (
    <div className="rounded-[1.75rem] border border-white/[0.07] bg-gradient-to-b from-zinc-900/95 to-zinc-950 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Was heute wichtig ist</p>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
              Daily Action Plan
            </p>
          </div>
        </div>
        {streakDays > 0 && (
          <span className="text-xs font-bold text-amber-300 tabular-nums">
            🔥 {streakDays}
          </span>
        )}
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
