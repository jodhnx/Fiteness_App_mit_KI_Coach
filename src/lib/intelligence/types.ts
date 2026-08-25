export type IntelligenceRecommendationType =
  | "nutrition"
  | "training"
  | "weight"
  | "progress"
  | "recovery"
  | "activity"
  | "achievement";

export type IntelligencePriority = "primary" | "secondary";

export type IntelligenceAction = {
  label: string;
  href: string;
};

export type IntelligenceRecommendation = {
  id: string;
  type: IntelligenceRecommendationType;
  priority: IntelligencePriority;
  title: string;
  description: string;
  values?: Record<string, number | string | null>;
  action?: IntelligenceAction;
};

export type NutritionIntelligenceSnapshot = {
  caloriesTarget: number | null;
  caloriesConsumed: number | null;
  caloriesRemaining: number | null;
  proteinTarget: number | null;
  proteinConsumed: number | null;
  proteinRemaining: number | null;
  onTrack: boolean;
};

export type TrainingIntelligenceSnapshot = {
  doneToday: boolean;
  plannedToday: boolean;
  activeSession: boolean;
  label: string | null;
  streakDays: number;
};

export type WeightIntelligenceSnapshot = {
  currentKg: number | null;
  change7dKg: number | null;
  trendLabel: "down" | "up" | "stable" | "insufficient_data";
  plateauDetected: boolean;
  targetKg: number | null;
};

export type ProgressIntelligenceSnapshot = {
  recentPr: { exerciseName: string; valueKg: number; achievedAt: string } | null;
  sessionImprovement: { exerciseName: string; detail: string } | null;
};

export type RecoveryIntelligenceSnapshot = {
  steps: number | null;
  stepGoal: number | null;
  sleepHours: number | null;
  recoveryScore: number | null;
};

export type ActivityIntelligenceSnapshot = {
  workoutsThisWeek: number | null;
};

export type DailyFitnessIntelligence = {
  generatedAt: string;
  nutrition: NutritionIntelligenceSnapshot;
  training: TrainingIntelligenceSnapshot;
  weight: WeightIntelligenceSnapshot;
  progress: ProgressIntelligenceSnapshot;
  recovery: RecoveryIntelligenceSnapshot;
  activity: ActivityIntelligenceSnapshot;
  primary: IntelligenceRecommendation | null;
  secondary: IntelligenceRecommendation[];
  allGood: boolean;
};
