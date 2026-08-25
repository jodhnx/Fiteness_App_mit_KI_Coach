import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type {
  DailyActionPlanContext,
  DailyPlanAction,
  ScoredCandidate,
} from "@/lib/intelligence/daily-plan/types";

const PROTEIN_WARN_G = 25;

function recoveryLow(ctx: DailyActionPlanContext): boolean {
  return (
    (ctx.recoveryScore != null && ctx.recoveryScore < 55) ||
    (ctx.trainingReadiness != null && ctx.trainingReadiness < 50)
  );
}

function weeklyProteinGood(ctx: DailyActionPlanContext): boolean {
  const w = ctx.weekly?.nutrition;
  return (
    w != null &&
    w.proteinDaysTotal >= 3 &&
    w.proteinDaysOnTarget / w.proteinDaysTotal >= 0.7
  );
}

function weeklyTrainingBehind(ctx: DailyActionPlanContext): boolean {
  const t = ctx.weekly?.training;
  return (
    t != null &&
    t.planned != null &&
    t.planned > 0 &&
    t.completed < t.planned &&
    t.status === "needs_attention"
  );
}

function isDuplicate(a: DailyPlanAction, b: DailyPlanAction): boolean {
  if (a.id === b.id) return true;
  if (a.action?.href && a.action.href === b.action?.href) {
    const sameType = a.type === b.type;
    const similarText =
      a.explanation.slice(0, 24) === b.explanation.slice(0, 24) ||
      a.title.toLowerCase() === b.title.toLowerCase();
    if (sameType && similarText) return true;
  }
  return false;
}

function withWeeklyContext(explanation: string, ctx: DailyActionPlanContext, kind: "protein" | "training"): string {
  if (kind === "protein" && weeklyProteinGood(ctx)) {
    return `${explanation} (Wochen-Protein weiterhin gut — heute nachziehen reicht.)`;
  }
  if (kind === "training" && ctx.weekly?.training.planned != null) {
    const { completed, planned } = ctx.weekly.training;
    if (completed < planned) {
      return `${explanation} (Diese Woche ${completed}/${planned} Trainings.)`;
    }
  }
  return explanation;
}

/** Collect scored action candidates from existing intelligence layers. */
export function collectDailyPlanCandidates(ctx: DailyActionPlanContext): ScoredCandidate[] {
  const candidates: ScoredCandidate[] = [];
  const hour = ctx.now.getHours();
  const daily = ctx.daily;
  const np = ctx.nutritionPerformance;
  const tp = ctx.trainingPerformance;
  const adaptive = ctx.adaptive;

  const proteinRemaining = np?.protein.remaining ?? daily?.nutrition.proteinRemaining ?? null;
  const caloriesRemaining = np?.calories.remaining ?? daily?.nutrition.caloriesRemaining ?? null;
  const trainingPending =
    !ctx.trainingDoneToday && !ctx.activeSession && Boolean(ctx.nextWorkout);

  if (trainingPending && ctx.nextWorkout) {
    let score = 75;
    if (weeklyTrainingBehind(ctx)) score += 15;
    if (hour < 16) score += 10;
    if (ctx.activeSession) score += 20;
    candidates.push({
      id: "plan-training-today",
      type: "training",
      title: ctx.nextWorkout.dayName,
      explanation: withWeeklyContext(
        `Heute ${ctx.nextWorkout.planName} — ${ctx.nextWorkout.dayName} absolvieren.`,
        ctx,
        "training"
      ),
      action: INTELLIGENCE_ACTIONS.training,
      priority: "primary",
      confidence: "high",
      requiresConfirmation: false,
      evidence: [`Geplant: ${ctx.nextWorkout.planName} — ${ctx.nextWorkout.dayName}`],
      score,
    });
  } else if (ctx.trainingDoneToday || ctx.activeSession) {
    candidates.push({
      id: "plan-training-done",
      type: "training",
      title: "Training",
      explanation: ctx.activeSession
        ? "Training läuft — Session abschließen."
        : "Training heute erledigt.",
      action: ctx.activeSession ? INTELLIGENCE_ACTIONS.training : undefined,
      priority: "secondary",
      confidence: "high",
      requiresConfirmation: false,
      evidence: [],
      score: 20,
    });
  }

  if (
    proteinRemaining != null &&
    proteinRemaining > PROTEIN_WARN_G &&
    np?.recommendationState !== "no_action_needed"
  ) {
    let score = 70;
    if (hour >= 17) score += 15;
    if (!trainingPending) score += 10;
    if (weeklyProteinGood(ctx)) score -= 5;

    candidates.push({
      id: "plan-protein-gap",
      type: "nutrition",
      title: "Protein",
      explanation: withWeeklyContext(
        np?.explanation ??
          `Noch ${Math.round(proteinRemaining)} g Protein${caloriesRemaining != null ? ` und ${Math.round(caloriesRemaining)} kcal` : ""} offen.`,
        ctx,
        "protein"
      ),
      action: INTELLIGENCE_ACTIONS.findMeal,
      priority: "primary",
      confidence: np?.confidence ?? "medium",
      requiresConfirmation: false,
      evidence: np?.evidence.slice(0, 3) ?? [`Protein offen: ${Math.round(proteinRemaining)} g`],
      score,
    });
  } else if (
    caloriesRemaining != null &&
    caloriesRemaining > 400 &&
    hour >= 17 &&
    np?.recommendationState === "calorie_priority"
  ) {
    candidates.push({
      id: "plan-calories-open",
      type: "nutrition",
      title: "Kalorien",
      explanation:
        np?.explanation ?? `Am Abend noch ${Math.round(caloriesRemaining)} kcal offen.`,
      action: INTELLIGENCE_ACTIONS.nutrition,
      priority: "primary",
      confidence: np?.confidence ?? "medium",
      requiresConfirmation: false,
      evidence: [`Kalorien offen: ${Math.round(caloriesRemaining)} kcal`],
      score: 65,
    });
  } else if (np?.recommendationState === "macro_balance") {
    candidates.push({
      id: "plan-macro-balance",
      type: "nutrition",
      title: "Makro-Balance",
      explanation: np.explanation,
      action: INTELLIGENCE_ACTIONS.nutrition,
      priority: "secondary",
      confidence: np.confidence,
      requiresConfirmation: false,
      evidence: np.evidence.slice(0, 2),
      score: 45,
    });
  }

  if (np?.primary) {
    const meal = np.primary;
    candidates.push({
      id: `plan-saved-meal-${meal.mealId}`,
      type: "nutrition",
      title: meal.name,
      explanation: `„${meal.name}" passt ungefähr: ${meal.protein} g Protein, ${meal.calories} kcal.${meal.remainingAfter ? ` Danach ca. ${meal.remainingAfter.proteinG ?? "?"} g Protein offen.` : ""}`,
      action: meal.action,
      priority: "secondary",
      confidence: meal.confidence,
      requiresConfirmation: false,
      evidence: [`Saved Meal: ${meal.name}`],
      score: 55 + meal.fitScore * 20,
    });
  }

  if (tp?.primary && tp.primary.lastPerformance) {
    const p = tp.primary;
    let score = 50;
    if (p.progressionState === "ready_to_progress") score += 25;
    if (recoveryLow(ctx)) score -= 15;

    candidates.push({
      id: `plan-perf-${p.exerciseLibraryId}`,
      type: "performance",
      title: p.exerciseName,
      explanation: p.explanation,
      action: INTELLIGENCE_ACTIONS.training,
      priority: "secondary",
      confidence: p.confidence,
      requiresConfirmation: false,
      evidence: p.evidence.slice(0, 2),
      score,
    });
  }

  if (recoveryLow(ctx)) {
    candidates.push({
      id: "plan-recovery-caution",
      type: "recovery",
      title: "Recovery",
      explanation: "Recovery heute berücksichtigen — keine aggressive Progression.",
      action: INTELLIGENCE_ACTIONS.progress,
      priority: "secondary",
      confidence: "medium",
      requiresConfirmation: false,
      evidence: [
        ctx.recoveryScore != null
          ? `Recovery: ${ctx.recoveryScore}%`
          : "Recovery niedrig",
      ],
      score: 40,
    });
  }

  if (adaptive?.primary) {
    const a = adaptive.primary;
    const dupTraining =
      a.type === "training" &&
      candidates.some((c) => c.type === "training" && c.id === "plan-training-today");
    if (!dupTraining) {
      candidates.push({
        id: `plan-adaptive-${a.id}`,
        type: a.type === "weight" || a.type === "goal" ? "weight" : "general",
        title: a.title,
        explanation: a.explanation,
        action: a.action,
        priority: "secondary",
        confidence: a.confidence,
        requiresConfirmation: a.requiresConfirmation,
        evidence: a.evidence.slice(0, 2),
        score: 35 + (a.confidence === "high" ? 15 : 0),
      });
    }
  }

  if (daily?.allGood || np?.recommendationState === "no_action_needed") {
    candidates.push({
      id: "plan-on-track",
      type: "general",
      title: "Heute",
      explanation: "Du bist heute im Plan.",
      action: INTELLIGENCE_ACTIONS.coach,
      priority: "primary",
      confidence: "high",
      requiresConfirmation: false,
      evidence: [],
      score: trainingPending || (proteinRemaining != null && proteinRemaining > PROTEIN_WARN_G) ? 5 : 90,
    });
  }

  if (!candidates.length) {
    candidates.push({
      id: "plan-insufficient",
      type: "general",
      title: "Heute",
      explanation: "Für heute liegen nicht genug Daten für eine konkrete Empfehlung vor.",
      action: INTELLIGENCE_ACTIONS.nutrition,
      priority: "primary",
      confidence: "low",
      requiresConfirmation: false,
      evidence: [],
      score: 1,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function omitScore(candidate: ScoredCandidate): Omit<ScoredCandidate, "score"> {
  const { score, ...action } = candidate;
  void score;
  return action;
}

export function prioritizeDailyPlan(candidates: ScoredCandidate[]): {
  primary: DailyPlanAction | null;
  secondary: DailyPlanAction[];
} {
  const ranked = [...candidates];
  const primaryCandidate = ranked[0];
  if (!primaryCandidate) return { primary: null, secondary: [] };

  const primary = omitScore(primaryCandidate);

  const secondary: DailyPlanAction[] = [];
  for (const c of ranked.slice(1)) {
    const action = omitScore(c);
    if (isDuplicate(primary, action)) continue;
    if (primary.type === "training" && action.type === "training" && action.action?.href === primary.action?.href) {
      continue;
    }
    if (secondary.some((s) => isDuplicate(s, action))) continue;
    secondary.push({ ...action, priority: "secondary" });
    if (secondary.length >= 2) break;
  }

  return {
    primary: { ...primary, priority: "primary" },
    secondary,
  };
}
