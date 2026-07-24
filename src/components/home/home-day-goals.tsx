"use client";

import { memo } from "react";
import { Flame, Footprints, Droplets, Dumbbell } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";

type Goal = {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  Icon: typeof Flame;
};

type Props = {
  caloriesConsumed: number;
  calorieTarget: number;
  steps: number;
  stepGoal: number;
  waterMl: number;
  waterTargetMl: number;
  trainingDone: boolean;
};

export const HomeDayGoals = memo(function HomeDayGoals({
  caloriesConsumed,
  calorieTarget,
  steps,
  stepGoal,
  waterMl,
  waterTargetMl,
  trainingDone,
}: Props) {
  const goals: Goal[] = [
    {
      id: "kcal",
      label: "Kalorien",
      current: caloriesConsumed,
      target: calorieTarget || 1,
      unit: "kcal",
      color: "bg-accent",
      Icon: Flame,
    },
    {
      id: "steps",
      label: "Schritte",
      current: steps,
      target: stepGoal || 10000,
      unit: "",
      color: "bg-cyan-400",
      Icon: Footprints,
    },
    {
      id: "water",
      label: "Wasser",
      current: waterMl,
      target: waterTargetMl || 2500,
      unit: "ml",
      color: "bg-sky-400",
      Icon: Droplets,
    },
    {
      id: "train",
      label: "Training",
      current: trainingDone ? 1 : 0,
      target: 1,
      unit: "",
      color: "bg-violet-400",
      Icon: Dumbbell,
    },
  ];

  return (
    <PremiumCard className="space-y-3">
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em]">
        Tagesziele
      </h2>
      <div className="space-y-3">
        {goals.map(({ id, label, current, target, unit, color, Icon }) => {
          const pct = Math.min(100, Math.round((current / target) * 100));
          return (
            <div key={id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  {label}
                </span>
                <span className="tabular-nums text-zinc-400">
                  {id === "train"
                    ? trainingDone
                      ? "Erledigt"
                      : "Offen"
                    : `${Math.round(current).toLocaleString("de-DE")}${unit ? ` ${unit}` : ""} / ${Math.round(target).toLocaleString("de-DE")}${unit ? ` ${unit}` : ""}`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", color)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
});
