import type { IntelligenceAction } from "@/lib/intelligence/types";

export type DailyPlanActionType =
  | "training"
  | "nutrition"
  | "performance"
  | "recovery"
  | "weight"
  | "general";

export type DailyPlanConfidence = "high" | "medium" | "low";

export type DailyPlanStatus = "on_track" | "needs_attention" | "insufficient_data";

export type DailyPlanAction = {
  id: string;
  type: DailyPlanActionType;
  title: string;
  explanation: string;
  action?: IntelligenceAction;
  priority: "primary" | "secondary";
  confidence: DailyPlanConfidence;
  requiresConfirmation: boolean;
  evidence: string[];
};

export type DailyActionPlan = {
  id: string;
  date: string;
  status: DailyPlanStatus;
  primary: DailyPlanAction | null;
  secondary: DailyPlanAction[];
  summary: string;
  evidence: string[];
  confidence: DailyPlanConfidence;
};

export type DailyActionPlanContext = {
  now: Date;
  daily: import("@/lib/intelligence/types").DailyFitnessIntelligence | null;
  weekly: import("@/lib/intelligence/weekly/types").WeeklyFitnessIntelligence | null;
  adaptive: import("@/lib/intelligence/recommendations/types").AdaptiveRecommendations | null;
  trainingPerformance: import("@/lib/intelligence/training-performance/types").TrainingPerformanceIntelligence | null;
  nutritionPerformance: import("@/lib/intelligence/nutrition-performance/types").NutritionPerformanceIntelligence | null;
  nextWorkout: { planName: string; dayName: string } | null;
  trainingDoneToday: boolean;
  activeSession: boolean;
  recoveryScore: number | null;
  trainingReadiness: number | null;
  nutritionGoal: string | null;
};

export type ScoredCandidate = DailyPlanAction & { score: number };
