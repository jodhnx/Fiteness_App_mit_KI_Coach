import type { WeeklyReport } from "@/lib/weekly-report";

export type WeeklyIntelligenceContext = {
  now: Date;
  weekLabel: string;
  weeklyReport: WeeklyReport;
  plannedWorkoutsPerWeek: number | null;
  nutritionGoal: string | null;
  trainingGoal: string | null;
  calorieTarget: number | null;
  proteinTarget: number | null;
  trainingStreakDays: number;
  prsThisWeek: {
    exerciseName: string;
    weightKg: number;
    achievedAt: Date;
  }[];
  sessionImprovement: { exerciseName: string; detail: string } | null;
  currentWeightKg: number | null;
};
