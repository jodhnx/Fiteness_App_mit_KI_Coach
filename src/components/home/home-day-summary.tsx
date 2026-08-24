"use client";

import { memo } from "react";
import { PremiumCard } from "@/components/ui/premium-card";
import { useLivePhoneSteps } from "@/hooks/use-live-phone-steps";

type Props = {
  caloriesLeft: number;
  proteinG: number;
  proteinTarget: number;
  steps: number;
  stepGoal: number;
  sleepHours: number | null;
  streakDays: number;
  trainingLabel?: string;
};

export const HomeDaySummary = memo(function HomeDaySummary({
  caloriesLeft,
  proteinG,
  proteinTarget,
  steps: serverSteps,
  stepGoal,
  sleepHours,
  streakDays,
  trainingLabel,
}: Props) {
  const steps = useLivePhoneSteps(serverSteps);
  const lines = [
    `${Math.round(caloriesLeft).toLocaleString("de-DE")} kcal noch übrig`,
    `Protein ${Math.round(proteinG)}/${Math.round(proteinTarget)} g`,
    `Schritte ${steps.toLocaleString("de-DE")} von ${stepGoal.toLocaleString("de-DE")}`,
    sleepHours != null ? `Schlaf ${sleepHours.toFixed(1)} h` : null,
    streakDays > 0 ? `Streak ${streakDays} Tage` : null,
    trainingLabel ? `Training: ${trainingLabel}` : null,
  ].filter(Boolean) as string[];

  return (
    <PremiumCard className="space-y-2">
      <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em]">
        Tageszusammenfassung
      </h2>
      <ul className="space-y-1.5">
        {lines.map((line) => (
          <li key={line} className="text-sm text-zinc-300 flex gap-2">
            <span className="text-accent">✓</span>
            {line}
          </li>
        ))}
      </ul>
    </PremiumCard>
  );
});
