import type { ActivityLevel, Gender, PlanLevel } from "@prisma/client";
import type { MainGoalKey } from "@/lib/onboarding-options";
import type { ConfigLocation } from "@/lib/plan-configurator";

export type GoalPace = "SLOW" | "MODERATE" | "FAST";

export type OnboardingDraft = {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  mainGoalKey: MainGoalKey;
  activityLevel: ActivityLevel;
  location: ConfigLocation;
  experienceLevel: PlanLevel;
  workoutDaysPerWeek: number;
  pace: GoalPace;
};

export const ONBOARDING_DRAFT_KEY = "onboarding-draft-v2";

export const GOAL_PACE_OPTIONS: { id: GoalPace; label: string; weeks: number }[] = [
  { id: "SLOW", label: "Langsam & nachhaltig", weeks: 16 },
  { id: "MODERATE", label: "Moderat", weeks: 10 },
  { id: "FAST", label: "Schnell", weeks: 6 },
];

export function paceToTargetDate(pace: GoalPace): Date {
  const weeks = GOAL_PACE_OPTIONS.find((p) => p.id === pace)?.weeks ?? 10;
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d;
}
