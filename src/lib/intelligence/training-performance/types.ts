export type ProgressionState =
  | "progressing"
  | "maintain"
  | "ready_to_progress"
  | "stalled"
  | "declining"
  | "insufficient_data";

export type PerformanceConfidence = "high" | "medium" | "low";

export type SetPerformance = {
  weightKg: number;
  reps: number;
  setNumber?: number;
};

export type SessionExercisePerformance = {
  sessionDate: string;
  sets: SetPerformance[];
  bestSet: SetPerformance | null;
  volumeKg: number;
};

export type ExercisePerformanceData = {
  exerciseLibraryId: string;
  exerciseName: string;
  targetSets: number;
  targetRepRange: { min: number; max: number } | null;
  planWeightKg: number | null;
  history: SessionExercisePerformance[];
  pr: { weightKg: number; achievedAt: string } | null;
};

export type ExercisePerformanceInsight = {
  exerciseLibraryId: string;
  exerciseName: string;
  lastPerformance: { weightKg: number; reps: number; sessionDate: string } | null;
  targetRepRange: { min: number; max: number } | null;
  planWeightKg: number | null;
  targetSets: number;
  progressionState: ProgressionState;
  recommendedWeightKg: number | null;
  recommendedRepRange: string | null;
  confidence: PerformanceConfidence;
  explanation: string;
  evidence: string[];
  volumeTrend: "up" | "down" | "stable" | null;
  prHighlight: string | null;
};

export type TrainingPerformanceIntelligence = {
  generatedAt: string;
  workoutLabel: string | null;
  exerciseCount: number;
  recoveryScore: number | null;
  recoveryCaution: boolean;
  exercises: ExercisePerformanceInsight[];
  primary: ExercisePerformanceInsight | null;
  secondary: ExercisePerformanceInsight[];
  coachContext: {
    summary: string;
    items: {
      title: string;
      explanation: string;
      evidence: string[];
      confidence: PerformanceConfidence;
      requiresConfirmation: boolean;
    }[];
  };
};

export type CompletedSetRow = {
  exerciseLibraryId: string | null;
  exerciseName: string;
  reps: number | null;
  weightKg: number | null;
  setNumber: number;
  completed: boolean;
};

export type PlanExerciseRow = {
  exerciseLibraryId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string | null;
  setTargets: unknown;
};
