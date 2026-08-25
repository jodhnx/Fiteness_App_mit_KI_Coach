"use client";

import { memo } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import { Bot, ChevronRight, Flame, Footprints, Dumbbell, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLivePhoneSteps } from "@/hooks/use-live-phone-steps";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";
import type { AdaptiveRecommendations } from "@/lib/intelligence/recommendations/types";
import type { DailyActionPlan } from "@/lib/intelligence/daily-plan/types";
import { HomeDailyActionPlanCard } from "@/components/home/home-daily-action-plan-card";
import { HomeIntelligenceCard } from "@/components/home/home-intelligence-card";
import { HomeAdaptiveRecommendationCard } from "@/components/home/home-adaptive-recommendation-card";

type Props = {
  streakDays?: number;
  trainingLabel?: string | null;
  trainingDone?: boolean;
  proteinConsumed?: number;
  proteinTarget?: number;
  steps?: number;
  stepGoal?: number;
  intelligence?: DailyFitnessIntelligence | null;
  adaptiveRecommendations?: AdaptiveRecommendations | null;
  dailyActionPlan?: DailyActionPlan | null;
};

function StatRow({
  icon: Icon,
  label,
  value,
  subText,
  done,
}: {
  icon: ElementType<{ className?: string }>;
  label: string;
  value: string;
  subText?: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={cn(
          "mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center shrink-0",
          done ? "bg-emerald-500/15" : "bg-zinc-800/80"
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            done ? "text-emerald-400" : "text-zinc-400"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            done ? "text-emerald-400" : "text-white"
          )}
        >
          {value}
        </p>
        {subText && (
          <p className="text-[11px] text-zinc-500 mt-0.5">{subText}</p>
        )}
      </div>
    </div>
  );
}

export const HomeCoachBriefing = memo(function HomeCoachBriefing({
  streakDays = 0,
  trainingLabel,
  trainingDone = false,
  proteinConsumed = 0,
  proteinTarget = 0,
  steps: serverSteps = 0,
  stepGoal = 10000,
  intelligence,
  adaptiveRecommendations,
  dailyActionPlan,
}: Props) {
  const steps = useLivePhoneSteps(serverSteps);

  const proteinLeft = Math.max(0, proteinTarget - proteinConsumed);
  const stepsLeft = Math.max(0, stepGoal - steps);
  const proteinDone =
    proteinTarget > 0 && proteinConsumed >= proteinTarget * 0.95;
  const stepsDone = steps >= stepGoal;

  return (
    <div className="rounded-[1.75rem] border border-white/[0.07] bg-gradient-to-b from-zinc-900/95 to-zinc-950 overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Heute</p>
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
              Fitness Intelligence
            </p>
          </div>
        </div>
        {streakDays > 0 && (
          <div className="flex items-center gap-1 bg-amber-500/10 rounded-xl px-2.5 py-1 border border-amber-500/20">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 tabular-nums">
              {streakDays}
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-3 grid grid-cols-2 gap-3">
        <StatRow
          icon={Dumbbell}
          label="Training"
          value={
            trainingLabel ?? (trainingDone ? "Heute erledigt" : "Geplant")
          }
          done={trainingDone}
        />
        <StatRow
          icon={Utensils}
          label="Protein"
          value={
            proteinDone
              ? `${Math.round(proteinConsumed)} g ✓`
              : `Noch ${proteinLeft} g`
          }
          subText={proteinTarget > 0 ? `Ziel: ${proteinTarget} g` : undefined}
          done={proteinDone}
        />
        <StatRow
          icon={Footprints}
          label="Schritte"
          value={
            stepsDone
              ? `${steps.toLocaleString("de-DE")} ✓`
              : `Noch ${stepsLeft.toLocaleString("de-DE")}`
          }
          subText={`Ziel: ${stepGoal.toLocaleString("de-DE")}`}
          done={stepsDone}
        />
      </div>

      <div className="mx-4 mb-3">
        {dailyActionPlan?.primary ? (
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
