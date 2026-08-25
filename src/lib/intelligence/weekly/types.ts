import type {
  IntelligenceAction,
  IntelligenceRecommendation,
} from "@/lib/intelligence/types";

export type WeeklyCategoryStatus =
  | "good"
  | "needs_attention"
  | "insufficient_data"
  | "on_track"
  | "positive"
  | "neutral";

export type WeeklyTrainingSnapshot = {
  completed: number;
  planned: number | null;
  completionRate: number | null;
  streakDays: number;
  status: WeeklyCategoryStatus;
};

export type WeeklyNutritionSnapshot = {
  avgProteinG: number | null;
  avgCaloriesKcal: number | null;
  proteinDaysOnTarget: number;
  proteinDaysTotal: number;
  calorieTarget: number | null;
  calorieDeltaVsTarget: number | null;
  status: WeeklyCategoryStatus;
};

export type WeeklyWeightSnapshot = {
  changeKg: number | null;
  currentKg: number | null;
  status: WeeklyCategoryStatus;
  trendLabel: "down" | "up" | "stable" | "insufficient_data";
};

export type WeeklyProgressSnapshot = {
  prsThisWeek: { exerciseName: string; valueKg: number; achievedAt: string }[];
  topImprovement: { exerciseName: string; detail: string } | null;
  status: WeeklyCategoryStatus;
};

export type WeeklyRecoverySnapshot = {
  avgStepsPerDay: number | null;
  avgSleepHours: number | null;
  activityCount: number;
  status: WeeklyCategoryStatus;
};

export type WeeklyAchievement = {
  id: string;
  type: "pr" | "training" | "nutrition" | "streak" | "goal";
  title: string;
  description: string;
};

export type WeeklyFitnessIntelligence = {
  generatedAt: string;
  weekLabel: string;
  training: WeeklyTrainingSnapshot;
  nutrition: WeeklyNutritionSnapshot;
  weight: WeeklyWeightSnapshot;
  progress: WeeklyProgressSnapshot;
  recovery: WeeklyRecoverySnapshot;
  achievements: WeeklyAchievement[];
  primary: IntelligenceRecommendation | null;
  secondary: IntelligenceRecommendation[];
  recommendations: IntelligenceRecommendation[];
  summary: string;
  /** Compact blocks for AI Coach context */
  coachContext: {
    weeklySummary: string;
    weeklyPriorities: string[];
    weeklyAchievements: string[];
    weeklyRecommendations: string[];
  };
};

export type WeeklyRecommendation = IntelligenceRecommendation & {
  action?: IntelligenceAction;
};
