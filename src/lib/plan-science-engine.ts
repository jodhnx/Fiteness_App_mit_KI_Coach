import type {
  MuscleGroup,
  PlanEfficiency,
  PlanEquipmentFilter,
  PlanGoal,
  PlanLevel,
} from "@prisma/client";
import type { CatalogPlan } from "@/lib/plan-catalog";
import { PLAN_CATALOG, getCatalogPlan } from "@/lib/plan-catalog";

export type SplitType = "UPPER_LOWER" | "PPL" | "FULL_BODY" | "BRO" | "SPECIALIZED";

export type RecommendationInput = {
  goal: PlanGoal;
  level: PlanLevel;
  daysPerWeek: number;
  durationMinutes: number;
  equipment: PlanEquipmentFilter;
  priorityMuscles?: MuscleGroup[];
  efficiency?: PlanEfficiency;
};

export type PlanScores = {
  efficiencyScore: number;
  recoveryScore: number;
  volumeScore: number;
  scienceScore: number;
  totalScore: number;
  splitType: SplitType;
  muscleFrequency: number;
  rationale: string[];
  warnings: string[];
};

/** Evidenzbasierte Split-Priorität (höher = besser für Hypertrophie/Effizienz) */
const SPLIT_PRIORITY_HYPERTROPHY: Record<SplitType, number> = {
  UPPER_LOWER: 100,
  PPL: 92,
  FULL_BODY: 85,
  SPECIALIZED: 70,
  BRO: 45,
};

const SPLIT_PRIORITY_STRENGTH: Record<SplitType, number> = {
  SPECIALIZED: 95,
  PPL: 88,
  UPPER_LOWER: 82,
  FULL_BODY: 75,
  BRO: 50,
};

const SPLIT_PRIORITY_FAT_LOSS: Record<SplitType, number> = {
  FULL_BODY: 95,
  UPPER_LOWER: 88,
  PPL: 82,
  SPECIALIZED: 72,
  BRO: 40,
};

export function classifySplit(catalogKey: string, daysPerWeek: number): SplitType {
  if (catalogKey.includes("BRO") || catalogKey === "BRO_SPLIT") return "BRO";
  if (catalogKey.includes("PPL") || catalogKey === "PUSH_PULL_LEGS" || catalogKey === "SCIENCE_PPL")
    return "PPL";
  if (
    catalogKey.includes("UPPER") ||
    catalogKey === "UPPER_LOWER" ||
    catalogKey === "SCIENCE_UPPER_LOWER"
  )
    return "UPPER_LOWER";
  if (catalogKey.includes("FULL") || catalogKey === "FULL_BODY" || catalogKey === "SCIENCE_FULL_BODY")
    return "FULL_BODY";
  if (daysPerWeek >= 5) return "BRO";
  if (daysPerWeek === 3) return "PPL";
  if (daysPerWeek === 4) return "UPPER_LOWER";
  return "FULL_BODY";
}

function splitPriorityTable(goal: PlanGoal): Record<SplitType, number> {
  if (goal === "STRENGTH_GAIN") return SPLIT_PRIORITY_STRENGTH;
  if (goal === "FAT_LOSS" || goal === "RECOMP") return SPLIT_PRIORITY_FAT_LOSS;
  return SPLIT_PRIORITY_HYPERTROPHY;
}

function levelFrequencyTarget(level: PlanLevel): { min: number; ideal: number; max: number } {
  switch (level) {
    case "BEGINNER":
      return { min: 1.5, ideal: 2, max: 2.5 };
    case "INTERMEDIATE":
      return { min: 2, ideal: 2.5, max: 3 };
    case "ADVANCED":
    case "PRO":
      return { min: 2, ideal: 3, max: 3.5 };
    default:
      return { min: 2, ideal: 2.5, max: 3 };
  }
}

function estimateMuscleFrequency(plan: CatalogPlan): number {
  const days = plan.daysPerWeek;
  if (plan.catalogKey.includes("UPPER") || plan.catalogKey === "UPPER_LOWER") return 2;
  if (plan.catalogKey.includes("PPL") || plan.catalogKey === "PUSH_PULL_LEGS") return 1.33;
  if (plan.catalogKey.includes("FULL")) return days >= 3 ? 3 : 2;
  if (plan.catalogKey.includes("BRO")) return 1;
  return Math.min(3, days / 2);
}

export function scoreCatalogPlan(
  plan: CatalogPlan,
  input: RecommendationInput
): PlanScores {
  const splitType = classifySplit(plan.catalogKey, plan.daysPerWeek);
  const splitTable = splitPriorityTable(input.goal);
  const rationale: string[] = [];
  const warnings: string[] = [];

  let efficiencyScore = splitTable[splitType];

  if (
    input.goal === "MUSCLE_GAIN" &&
    (input.level === "ADVANCED" || input.level === "PRO") &&
    input.efficiency === "MAX_EFFICIENCY" &&
    splitType === "BRO"
  ) {
    efficiencyScore = Math.min(efficiencyScore, 35);
    rationale.push(
      "Bro-Split wird für maximale Hypertrophie-Effizienz nicht empfohlen: niedrige Muskel-Frequenz (1×/Woche)."
    );
    warnings.push("Bro-Split: unteroptimal für fortgeschrittene Muskelaufbau-Ziele.");
  }

  if (input.goal === "MUSCLE_GAIN" && splitType === "UPPER_LOWER") {
    rationale.push(
      "Upper/Lower: 2× Frequenz pro Muskelgruppe – starke Evidenz für Hypertrophie (Nippard, Israetel)."
    );
  }
  if (input.goal === "MUSCLE_GAIN" && splitType === "PPL") {
    rationale.push("PPL: hohe Frequenz, gutes Volumen pro Session, sehr zeiteffizient.");
  }

  if (plan.scienceBased) {
    efficiencyScore = Math.min(100, efficiencyScore + 8);
    rationale.push("Science-Based Struktur: 10–20 Sätze/Muskel, RIR, progressive Überladung.");
  }

  const daysMatch =
    input.daysPerWeek === plan.daysPerWeek
      ? 15
      : Math.abs(input.daysPerWeek - plan.daysPerWeek) === 1
        ? 8
        : 0;
  efficiencyScore = Math.min(100, efficiencyScore + daysMatch);

  if (plan.equipment.includes(input.equipment)) {
    efficiencyScore = Math.min(100, efficiencyScore + 5);
  } else {
    efficiencyScore -= 20;
    warnings.push("Equipment passt nicht vollständig zu deiner Auswahl.");
  }

  const freq = estimateMuscleFrequency(plan);
  const freqTarget = levelFrequencyTarget(input.level);
  let scienceScore = plan.scienceBased ? 88 : 72;
  if (freq >= freqTarget.min && freq <= freqTarget.max + 0.5) {
    scienceScore = Math.min(100, scienceScore + 10);
    rationale.push(`Muskel-Frequenz ~${freq.toFixed(1)}×/Woche – im empfohlenen Bereich.`);
  } else if (freq < freqTarget.min) {
    scienceScore -= 15;
    warnings.push("Trainingsfrequenz pro Muskel eher niedrig für optimales Wachstum.");
  }

  let recoveryScore = 80;
  if (input.level === "BEGINNER" && plan.daysPerWeek > 4) {
    recoveryScore -= 25;
    warnings.push("Für Beginner sind >4 Trainingstage/Woche oft zu viel.");
  }
  if (plan.daysPerWeek >= 6) recoveryScore -= 15;
  if (input.goal === "FAT_LOSS" && plan.daysPerWeek <= 4) recoveryScore += 10;

  const setsPerWeek = plan.days.reduce(
    (a, d) => a + (d.targetSets ?? 3) * d.exerciseSlugs.length,
    0
  );
  let volumeScore = 70;
  if (input.goal === "MUSCLE_GAIN") {
    if (setsPerWeek >= 60 && setsPerWeek <= 120) volumeScore = 90;
    else if (setsPerWeek < 40) {
      volumeScore = 50;
      warnings.push("Gesamtvolumen eher niedrig für Muskelaufbau.");
    } else if (setsPerWeek > 140) {
      volumeScore = 55;
      warnings.push("Sehr hohes Wochenvolumen – Regeneration beachten.");
    }
  }
  if (input.goal === "STRENGTH_GAIN" && setsPerWeek >= 40 && setsPerWeek <= 80) volumeScore = 88;

  const durationMatch =
    Math.abs(plan.durationMinutes - input.durationMinutes) <= 15 ? 10 : 0;
  volumeScore = Math.min(100, volumeScore + durationMatch);

  const totalScore = Math.round(
    efficiencyScore * 0.35 +
      scienceScore * 0.3 +
      recoveryScore * 0.2 +
      volumeScore * 0.15
  );

  return {
    efficiencyScore: Math.round(Math.min(100, efficiencyScore)),
    recoveryScore: Math.round(Math.min(100, recoveryScore)),
    volumeScore: Math.round(Math.min(100, volumeScore)),
    scienceScore: Math.round(Math.min(100, scienceScore)),
    totalScore: Math.min(100, totalScore),
    splitType,
    muscleFrequency: freq,
    rationale,
    warnings,
  };
}

/** Ziel × Level → bevorzugter Katalog-Schlüssel (evidenzbasiert) */
const GOAL_LEVEL_PICKS: Record<PlanGoal, Record<PlanLevel, string>> = {
  MUSCLE_GAIN: {
    BEGINNER: "SCIENCE_FULL_BODY",
    INTERMEDIATE: "SCIENCE_UPPER_LOWER",
    ADVANCED: "SCIENCE_UPPER_LOWER",
    PRO: "SCIENCE_PPL",
  },
  STRENGTH_GAIN: {
    BEGINNER: "FULL_BODY",
    INTERMEDIATE: "STRENGTH",
    ADVANCED: "STRENGTH_FOCUS",
    PRO: "STRENGTH_FOCUS",
  },
  FAT_LOSS: {
    BEGINNER: "BEGINNER",
    INTERMEDIATE: "CUTTING_FOCUS",
    ADVANCED: "CUTTING_FOCUS",
    PRO: "SCIENCE_UPPER_LOWER",
  },
  RECOMP: {
    BEGINNER: "FULL_BODY",
    INTERMEDIATE: "UPPER_LOWER",
    ADVANCED: "SCIENCE_UPPER_LOWER",
    PRO: "SCIENCE_PPL",
  },
  GENERAL_FITNESS: {
    BEGINNER: "BEGINNER",
    INTERMEDIATE: "FULL_BODY",
    ADVANCED: "UPPER_LOWER",
    PRO: "SCIENCE_PPL",
  },
};

export function recommendCatalogPlans(input: RecommendationInput): Array<
  CatalogPlan & { scores: PlanScores; rank: number }
> {
  let candidates = PLAN_CATALOG.filter((plan) => {
    if (
      input.equipment !== "GYM" &&
      !plan.equipment.includes(input.equipment)
    ) {
      return false;
    }
    if (Math.abs(plan.daysPerWeek - input.daysPerWeek) > 2) return false;
    return true;
  });

  if (candidates.length === 0) {
    candidates = PLAN_CATALOG.filter(
      (p) =>
        input.equipment === "GYM" ||
        p.equipment.includes(input.equipment) ||
        p.equipment.includes("GYM")
    );
  }
  if (candidates.length === 0) candidates = [...PLAN_CATALOG];

  const preferredKey = GOAL_LEVEL_PICKS[input.goal]?.[input.level];
  const scored = candidates.map((plan) => ({
    ...plan,
    scores: scoreCatalogPlan(plan, input),
  }));

  if (preferredKey) {
    const pref = scored.find((p) => p.catalogKey === preferredKey);
    if (pref) pref.scores.totalScore = Math.min(100, pref.scores.totalScore + 12);
  }

  if (
    input.goal === "MUSCLE_GAIN" &&
    input.efficiency === "MAX_EFFICIENCY"
  ) {
    for (const p of scored) {
      if (p.scores.splitType === "BRO") p.scores.totalScore = Math.max(0, p.scores.totalScore - 25);
    }
  }

  scored.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

  return scored.map((p, i) => ({ ...p, rank: i + 1 }));
}

export function getBestCatalogKeyForInput(input: RecommendationInput): string {
  const ranked = recommendCatalogPlans(input);
  return ranked[0]?.catalogKey ?? "SCIENCE_UPPER_LOWER";
}

/** Satz-/Wiederholungsvorgaben nach Ziel (RP/Israetel-inspiriert) */
export function prescriptionForGoal(goal: PlanGoal, level: PlanLevel) {
  switch (goal) {
    case "STRENGTH_GAIN":
      return { setsPerExercise: level === "BEGINNER" ? 4 : 5, reps: "3-6", restSeconds: 180 };
    case "FAT_LOSS":
    case "RECOMP":
      return { setsPerExercise: 3, reps: "8-12", restSeconds: 75 };
    case "MUSCLE_GAIN":
      return {
        setsPerExercise: level === "BEGINNER" ? 3 : 4,
        reps: "6-12",
        restSeconds: 90,
      };
    default:
      return { setsPerExercise: 3, reps: "8-15", restSeconds: 90 };
  }
}

export type UserPlanScoreInput = {
  goal: PlanGoal;
  level: PlanLevel;
  daysPerWeek: number;
  days: {
    name: string;
    exercises: { muscleGroup: MuscleGroup; targetSets: number }[];
  }[];
};

export function scoreUserPlan(input: UserPlanScoreInput): PlanScores {
  const mockKey =
    input.daysPerWeek >= 5
      ? "BRO_SPLIT"
      : input.daysPerWeek === 4
        ? "UPPER_LOWER"
        : input.daysPerWeek === 3
          ? "PUSH_PULL_LEGS"
          : "FULL_BODY";
  const catalog = getCatalogPlan(mockKey);
  const recInput: RecommendationInput = {
    goal: input.goal,
    level: input.level,
    daysPerWeek: input.daysPerWeek,
    durationMinutes: 60,
    equipment: "GYM",
    efficiency: "SCIENCE_OPTIMIZED",
  };
  if (!catalog) {
    return scoreCatalogPlan(
      {
        ...PLAN_CATALOG[0],
        daysPerWeek: input.daysPerWeek,
        days: input.days.map((d) => ({ name: d.name, exerciseSlugs: [] })),
      },
      recInput
    );
  }
  const base = scoreCatalogPlan(catalog, recInput);
  const muscleSets: Record<string, number> = {};
  for (const day of input.days) {
    for (const ex of day.exercises) {
      muscleSets[ex.muscleGroup] = (muscleSets[ex.muscleGroup] ?? 0) + ex.targetSets;
    }
  }
  const volumes = Object.values(muscleSets);
  const warnings = [...base.warnings];
  if (volumes.some((v) => v < 8)) warnings.push("Einige Muskelgruppen unter ~10 Sätzen/Woche.");
  if (volumes.some((v) => v > 22)) warnings.push("Einige Muskelgruppen über ~20 Sätzen/Woche (MRV-Risiko).");

  return { ...base, warnings };
}

export type ProgressWarning = {
  type: "LOW_VOLUME" | "HIGH_VOLUME" | "LOW_FREQUENCY" | "OVERREACHING" | "PLATEAU";
  message: string;
  severity: "info" | "warning" | "critical";
};

export function analyzeTrainingWarnings(stats: {
  weeklyVolume: number[];
  sessionsPerWeek: number[];
  muscleVolume: Record<string, number>;
  weeksSincePR: number;
}): ProgressWarning[] {
  const warnings: ProgressWarning[] = [];
  const avgVol =
    stats.weeklyVolume.reduce((a, b) => a + b, 0) / Math.max(1, stats.weeklyVolume.length);
  const lastVol = stats.weeklyVolume[stats.weeklyVolume.length - 1] ?? 0;

  if (lastVol < avgVol * 0.5 && avgVol > 5000) {
    warnings.push({
      type: "LOW_VOLUME",
      message: "Aktuelles Wochenvolumen deutlich unter deinem Durchschnitt.",
      severity: "warning",
    });
  }
  if (lastVol > avgVol * 1.4 && avgVol > 0) {
    warnings.push({
      type: "HIGH_VOLUME",
      message: "Wochenvolumen stark erhöht – Deload oder Regeneration einplanen.",
      severity: "warning",
    });
  }
  const avgSessions =
    stats.sessionsPerWeek.reduce((a, b) => a + b, 0) /
    Math.max(1, stats.sessionsPerWeek.length);
  if (avgSessions < 2) {
    warnings.push({
      type: "LOW_FREQUENCY",
      message: "Trainingsfrequenz unter 2×/Woche – Fortschritt kann stagnieren.",
      severity: "info",
    });
  }
  if (stats.sessionsPerWeek.slice(-2).every((s) => s >= 5)) {
    warnings.push({
      type: "OVERREACHING",
      message: "5+ Sessions in Folge – Überlastungsrisiko.",
      severity: "critical",
    });
  }
  if (stats.weeksSincePR >= 4) {
    warnings.push({
      type: "PLATEAU",
      message: "Keine PRs seit 4+ Wochen – Satz-/Rep-Schema oder Deload prüfen.",
      severity: "info",
    });
  }
  return warnings;
}
