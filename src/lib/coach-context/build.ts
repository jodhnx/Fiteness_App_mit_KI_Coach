import { prisma } from "@/lib/prisma";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import {
  TRAINING_GOAL_LABELS,
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
} from "@/lib/profile-calculations";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import { startOfDay, subDays } from "date-fns";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";
import {
  getWeeklyFitnessIntelligence,
  formatWeeklyIntelligenceForCoach,
} from "@/lib/intelligence/weekly";
import {
  getDailyFitnessIntelligence,
  buildAdaptiveRecommendations,
  filterAdaptiveRecommendationsForCoach,
  getTrainingPerformanceIntelligence,
  formatTrainingPerformanceForCoach,
  buildNutritionPerformanceIntelligence,
  formatNutritionPerformanceForCoach,
  loadNutritionPerformanceContext,
} from "@/lib/intelligence";
import {
  buildDailyActionPlanFromHome,
  formatDailyActionPlanForCoach,
} from "@/lib/intelligence/daily-plan";
import {
  actionsForContextMode,
  detectCoachContextMode,
  type CoachAction,
  type CoachContextMode,
} from "@/lib/coach-actions";
import { coachContextNeeds } from "@/lib/coach-context/needs";
import {
  dayPartLabel,
  formatAdaptiveForCoach,
  formatDailyIntelForCoach,
  formatWeeklyIntelCompact,
} from "@/lib/coach-context/format";
import { macrosForQuantity, roundMacros, sumMacros } from "@/lib/food-macros";
import type { SavedMealSummary } from "@/lib/saved-meals-cache";

const PROFILE_SELECT = {
  age: true,
  weightKg: true,
  heightCm: true,
  gender: true,
  activityLevel: true,
  trainingGoal: true,
  nutritionGoal: true,
  experienceLevel: true,
  workoutDaysPerWeek: true,
  calorieTarget: true,
  proteinTargetG: true,
  carbsTargetG: true,
  fatTargetG: true,
  bmi: true,
  targetWeightKg: true,
  targetWeightDate: true,
} as const;

export type CoachContextBuildResult = {
  mode: CoachContextMode;
  contextText: string;
  actions: CoachAction[];
};

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "keine Daten";
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
}

function pushSection(lines: string[], title: string, body: string[]) {
  if (body.length === 0) return;
  lines.push(`[${title}]`);
  lines.push(...body);
}

async function loadSavedMealsForCoach(userId: string): Promise<SavedMealSummary[]> {
  const recipes = await prisma.recipe.findMany({
    where: { userId, isMealTemplate: true },
    take: 5,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      servings: true,
      isMealTemplate: true,
      ingredients: {
        select: {
          quantityG: true,
          foodItemId: true,
          foodItem: {
            select: {
              name: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              servingG: true,
            },
          },
        },
      },
    },
  });

  return recipes.map((r) => {
    const total = roundMacros(
      sumMacros(
        r.ingredients.map((i) =>
          macrosForQuantity(i.foodItem, i.quantityG)
        )
      )
    );
    const servings = r.servings || 1;
    return {
      id: r.id,
      name: r.name,
      servings,
      isMealTemplate: r.isMealTemplate,
      ingredients: r.ingredients.map((i) => ({
        foodItemId: i.foodItemId,
        name: i.foodItem.name,
        quantityG: i.quantityG,
      })),
      macros: {
        perServing: {
          calories: Math.round(total.calories / servings),
          proteinG: Math.round(total.proteinG / servings),
          carbsG: Math.round(total.carbsG / servings),
          fatG: Math.round(total.fatG / servings),
        },
        total,
      },
    };
  });
}

function formatSavedMealsForCoach(meals: SavedMealSummary[]): string[] {
  if (!meals.length) return ["Saved Meals: keine vorhanden"];
  return meals.slice(0, 4).map(
    (m) =>
      `${m.name}: ${m.macros.perServing.proteinG} g Protein, ${m.macros.perServing.calories} kcal/Portion`
  );
}

function formatSessionSets(
  sessions: {
    name: string;
    completedAt: Date | null;
    startedAt: Date;
    sets: {
      exerciseName: string;
      reps: number | null;
      weightKg: number | null;
      completed: boolean;
    }[];
  }[]
): string[] {
  if (!sessions.length) return ["Letzte Sessions: keine Daten"];
  const lines: string[] = [];
  for (const s of sessions.slice(0, 2)) {
    const date = (s.completedAt ?? s.startedAt).toISOString().slice(0, 10);
    lines.push(`Session ${s.name} (${date}):`);
    const byExercise = new Map<string, { reps: number; weight: number }[]>();
    for (const set of s.sets.filter((x) => x.completed)) {
      const list = byExercise.get(set.exerciseName) ?? [];
      if (set.reps != null) {
        list.push({ reps: set.reps, weight: set.weightKg ?? 0 });
      }
      byExercise.set(set.exerciseName, list);
    }
    for (const [ex, sets] of byExercise) {
      const top = sets.sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
      if (top) {
        lines.push(
          `  ${ex}: ${top.reps} Reps${top.weight > 0 ? ` @ ${top.weight} kg` : ""}`
        );
      }
    }
  }
  return lines;
}

function actionsWithSavedMeals(
  mode: CoachContextMode,
  savedMeals: SavedMealSummary[]
): CoachAction[] {
  const base = actionsForContextMode(mode);
  if (mode !== "nutrition" || savedMeals.length === 0) return base;
  const savedAction: CoachAction = {
    id: "openSavedMeals",
    label: "Gespeicherte Mahlzeiten",
    href: "/nutrition",
  };
  return [savedAction, ...base];
}

/**
 * Personal Coach Context 3.0 — selective, intent-based context assembly.
 */
export async function buildPersonalCoachContext(
  userId: string,
  message: string,
  hint?: CoachContextMode | null
): Promise<CoachContextBuildResult> {
  const mode = detectCoachContextMode(message, hint);
  const needs = coachContextNeeds(mode);
  const today = startOfDay(new Date());

  const [
    profile,
    user,
    nutrition,
    training,
    recentSessions,
    detailedSessions,
    weightEntries,
    weightToday,
    healthToday,
    recentPrs,
    goals,
    savedMeals,
    recentMeals,
  ] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: PROFILE_SELECT,
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
    needs.nutrition
      ? loadNutritionDashboard(userId, today).catch(() => null)
      : Promise.resolve(null),
    needs.training
      ? loadTrainingSnapshot(userId).catch(() => null)
      : Promise.resolve(null),
    needs.training && !needs.trainingDetail
      ? prisma.workoutSession.findMany({
          where: { userId, status: "COMPLETED" },
          take: mode === "weekly" ? 5 : 3,
          orderBy: { startedAt: "desc" },
          select: {
            name: true,
            startedAt: true,
            completedAt: true,
          },
        })
      : Promise.resolve([]),
    needs.trainingDetail
      ? prisma.workoutSession.findMany({
          where: { userId, status: "COMPLETED" },
          take: 2,
          orderBy: { completedAt: "desc" },
          select: {
            name: true,
            startedAt: true,
            completedAt: true,
            sets: {
              where: { completed: true },
              take: 24,
              orderBy: { setNumber: "asc" },
              select: {
                exerciseName: true,
                reps: true,
                weightKg: true,
                completed: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    needs.weight
      ? prisma.progressEntry.findMany({
          where: {
            userId,
            weightKg: { not: null },
            date: { gte: subDays(today, mode === "weight" ? 28 : 14) },
          },
          orderBy: { date: "asc" },
          take: 16,
          select: { date: true, weightKg: true },
        })
      : Promise.resolve([]),
    needs.weight || needs.nutrition
      ? prisma.progressEntry
          .findFirst({
            where: { userId, date: today, weightKg: { not: null } },
            select: { weightKg: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    needs.activity
      ? prisma.dailyHealthMetric
          .findFirst({
            where: { userId, date: today },
            select: {
              steps: true,
              sleepHours: true,
              restingHeartRate: true,
              recoveryScore: true,
              trainingReadiness: true,
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
    needs.prs
      ? prisma.personalRecord.findMany({
          where: { userId },
          orderBy: { achievedAt: "desc" },
          take: 5,
          include: { exercise: { select: { name: true } } },
        })
      : Promise.resolve([]),
    needs.goals
      ? prisma.goal.findMany({
          where: { userId, completed: false },
          take: 4,
          select: { title: true },
        })
      : Promise.resolve([]),
    needs.savedMeals
      ? loadSavedMealsForCoach(userId).catch(() => [] as SavedMealSummary[])
      : Promise.resolve([] as SavedMealSummary[]),
    needs.nutrition
      ? prisma.meal
          .findMany({
            where: { userId, date: { gte: subDays(today, 3), lt: today } },
            take: 6,
            orderBy: { date: "desc" },
            select: {
              date: true,
              mealType: true,
              items: {
                take: 2,
                select: { foodItem: { select: { name: true } } },
              },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const lines: string[] = [
    `Kontext-Modus: ${mode}`,
    `Tag: ${today.toISOString().slice(0, 10)} · Tageszeit: ${dayPartLabel()}`,
    "Regel: Nur vorhandene Zahlen verwenden. Fehlende Werte = „keine Daten“ — nicht schätzen.",
  ];

  // USER GOALS (always slim)
  const goalLines: string[] = [
    `Name: ${user?.name ?? "keine Daten"}`,
  ];
  if (profile) {
    goalLines.push(
      `Ziel Training: ${profile.trainingGoal ? TRAINING_GOAL_LABELS[profile.trainingGoal] : "keine Daten"}`,
      `Ziel Ernährung: ${profile.nutritionGoal ? NUTRITION_GOAL_LABELS[profile.nutritionGoal] : "keine Daten"}`,
      `Kalorienziel: ${profile.calorieTarget ?? "keine Daten"} kcal`,
      `Proteinziel: ${profile.proteinTargetG ?? "keine Daten"} g`,
      `Trainingstage/Woche: ${profile.workoutDaysPerWeek ?? "keine Daten"}`,
      `Zielgewicht: ${profile.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "keine Daten"}`,
      `Aktuelles Gewicht: ${fmt(profile.weightKg, 1)} kg`,
      `Erfahrung: ${profile.experienceLevel ? EXPERIENCE_LABELS[profile.experienceLevel] : "keine Daten"}`,
      `Aktivität: ${profile.activityLevel ? ACTIVITY_LABELS[profile.activityLevel] : "keine Daten"}`
    );
  } else {
    goalLines.push("Profil: keine Daten");
  }
  if (goals.length) {
    goalLines.push(`Aktive Ziele: ${goals.map((g) => g.title).join(", ")}`);
  }
  pushSection(lines, "USER GOALS", goalLines);

  // CURRENT DAY — nutrition
  if (needs.nutrition && nutrition) {
    const c = nutrition.consumed;
    const t = nutrition.targets;
    const r = nutrition.remaining;
    const dayLines = [
      `Kalorien: ${fmt(c.calories)}/${fmt(t.calories)} kcal (offen: ${fmt(r.calories)})`,
      `Protein: ${fmt(c.proteinG)}/${fmt(t.proteinG)} g (offen: ${fmt(r.proteinG)})`,
      `KH: ${fmt(c.carbsG)}/${fmt(t.carbsG)} g · Fett: ${fmt(c.fatG)}/${fmt(t.fatG)} g`,
      `Wasser: ${fmt(nutrition.water.consumedMl)}/${fmt(nutrition.water.targetMl)} ml`,
    ];
    const mealSlots = nutrition.mealsByType
      .filter((slot) => slot.items.length > 0)
      .map(
        (slot) =>
          `${slot.mealType}: ${slot.items.map((i) => i.food.name).slice(0, 4).join(", ")}`
      );
    if (mealSlots.length) {
      dayLines.push(`Heutige Mahlzeiten: ${mealSlots.join(" | ")}`);
    } else {
      dayLines.push("Heutige Mahlzeiten: keine Einträge");
    }
    if (weightToday?.weightKg != null) {
      dayLines.push(`Gewicht heute: ${fmt(weightToday.weightKg, 1)} kg`);
    }
    pushSection(lines, "TODAY NUTRITION", dayLines);
  } else if (needs.nutrition) {
    pushSection(lines, "TODAY NUTRITION", ["Ernährungsdaten heute: keine Daten"]);
  }

  if (needs.savedMeals) {
    pushSection(lines, "SAVED MEALS", formatSavedMealsForCoach(savedMeals));
  }

  if (needs.nutrition && recentMeals.length) {
    const pattern = recentMeals
      .slice(0, 4)
      .map(
        (m) =>
          `${m.date.toISOString().slice(0, 10)} ${m.mealType}: ${m.items
            .map((i) => i.foodItem?.name)
            .filter(Boolean)
            .join(", ") || "—"}`
      );
    pushSection(lines, "RECENT MEALS", pattern);
  }

  // TRAINING
  if (needs.training) {
    const tLines: string[] = [];
    if (training) {
      const streak =
        training.trainingStreak?.currentDays ?? training.streak?.currentDays ?? null;
      tLines.push(
        `Streak: ${streak != null ? `${streak} Tage` : "keine Daten"}`,
        `Aktive Session: ${training.activeSession?.id ? "ja (läuft)" : "nein"}`,
        `Geplant heute: ${
          training.nextWorkout
            ? `${training.nextWorkout.planName} — ${training.nextWorkout.dayName}${
                training.nextWorkout.exerciseCount != null
                  ? ` (${training.nextWorkout.exerciseCount} Übungen)`
                  : ""
              }`
            : "kein Plan hinterlegt"
        }`
      );
    } else {
      tLines.push("Trainings-Snapshot: keine Daten");
    }

    if (needs.trainingDetail && detailedSessions.length) {
      tLines.push(...formatSessionSets(detailedSessions));
    } else if (recentSessions.length) {
      tLines.push(
        `Letzte Sessions: ${recentSessions
          .map(
            (s) =>
              `${s.name} (${(s.completedAt ?? s.startedAt).toISOString().slice(0, 10)})`
          )
          .join("; ")}`
      );
    } else if (needs.training) {
      tLines.push("Letzte Sessions: keine Daten");
    }

    if (needs.prs && recentPrs.length) {
      tLines.push(
        `PRs: ${recentPrs
          .map(
            (pr) =>
              `${pr.exercise.name} ${pr.weightKg ?? pr.value}${
                pr.weightKg != null ? " kg" : ""
              }${pr.reps != null ? ` × ${pr.reps}` : ""}`
          )
          .join("; ")}`
      );
    }
    pushSection(lines, "TRAINING", tLines);
  }

  // TRAINING PERFORMANCE 3.0
  if (needs.trainingPerformance) {
    try {
      const perfIntel = await getTrainingPerformanceIntelligence(userId);
      pushSection(
        lines,
        "TRAINING PERFORMANCE",
        formatTrainingPerformanceForCoach(perfIntel, mode === "general")
      );
    } catch {
      pushSection(lines, "TRAINING PERFORMANCE", ["Performance-Daten: nicht verfügbar"]);
    }
  }

  // WEIGHT / PROGRESS
  if (needs.weight) {
    const pLines: string[] = [
      `Profil-Gewicht: ${fmt(profile?.weightKg, 1)} kg`,
      `Zielgewicht: ${profile?.targetWeightKg != null ? `${profile.targetWeightKg} kg` : "keine Daten"}`,
    ];
    if (weightToday?.weightKg != null) {
      pLines.push(`Heute eingetragen: ${fmt(weightToday.weightKg, 1)} kg`);
    }
    if (weightEntries.length >= 2) {
      const first = weightEntries[0]!;
      const last = weightEntries[weightEntries.length - 1]!;
      const delta =
        Math.round(((last.weightKg ?? 0) - (first.weightKg ?? 0)) * 10) / 10;
      pLines.push(
        `Trend (${weightEntries.length} Einträge): ${delta > 0 ? "+" : ""}${delta} kg`,
        `Letzte: ${weightEntries
          .slice(-4)
          .map((e) => `${e.date.toISOString().slice(0, 10)}=${fmt(e.weightKg, 1)}`)
          .join(", ")}`
      );
    } else if (weightEntries.length === 1) {
      pLines.push(
        `Nur 1 Eintrag (${fmt(weightEntries[0]!.weightKg, 1)} kg) — Trend nicht berechenbar`
      );
    } else {
      pLines.push("Gewichtshistorie: keine Daten");
    }
    pushSection(lines, "WEIGHT", pLines);
  }

  // ACTIVITY / RECOVERY
  if (needs.activity) {
    const aLines: string[] = [];
    if (healthToday) {
      aLines.push(
        `Schritte: ${healthToday.steps ?? "keine Daten"}`,
        `Schlaf: ${healthToday.sleepHours != null ? `${healthToday.sleepHours.toFixed(1)} h` : "keine Daten"}`,
        ...(healthToday.trainingReadiness != null
          ? [`Trainingsbereitschaft: ${healthToday.trainingReadiness}%`]
          : []),
        ...(healthToday.recoveryScore != null
          ? [`Regeneration: ${healthToday.recoveryScore}%`]
          : [])
      );
    } else {
      aLines.push("Aktivität/Recovery heute: keine Daten");
    }
    pushSection(lines, "RECOVERY", aLines);
  }

  // INTELLIGENCE — single fetch, no duplicate weekly calls
  let dailyIntel = null;
  let weeklyIntel = null;
  let adaptiveFiltered = null;

  if (needs.dailyIntel || needs.weeklyIntel || needs.adaptive) {
    try {
      [dailyIntel, weeklyIntel] = await Promise.all([
        needs.dailyIntel
          ? getDailyFitnessIntelligence(userId)
          : Promise.resolve(null),
        needs.weeklyIntel
          ? getWeeklyFitnessIntelligence(userId)
          : Promise.resolve(null),
      ]);

      if (needs.dailyIntel && dailyIntel) {
        pushSection(
          lines,
          mode === "general" ? "TODAY" : "DAILY INTELLIGENCE",
          formatDailyIntelForCoach(dailyIntel, mode)
        );
      }

      if (needs.weeklyIntel && weeklyIntel) {
        if (mode === "weekly") {
          pushSection(
            lines,
            "WEEKLY INTELLIGENCE",
            formatWeeklyIntelligenceForCoach(weeklyIntel).split("\n")
          );
        } else {
          pushSection(
            lines,
            mode === "general" ? "WEEK" : "WEEKLY INTELLIGENCE",
            formatWeeklyIntelCompact(weeklyIntel, mode)
          );
        }
      }

      if (needs.adaptive && (dailyIntel || weeklyIntel)) {
        adaptiveFiltered = filterAdaptiveRecommendationsForCoach(
          buildAdaptiveRecommendations({
            now: new Date(),
            nutritionGoal: profile?.nutritionGoal ?? null,
            daily: dailyIntel,
            weekly: weeklyIntel,
            savedMeals: savedMeals.length ? savedMeals : undefined,
            proteinTargetG: profile?.proteinTargetG ?? null,
            workoutDaysPerWeek: profile?.workoutDaysPerWeek ?? null,
          }),
          mode
        );
        pushSection(
          lines,
          mode === "general" ? "RECOMMENDATION" : "ADAPTIVE RECOMMENDATIONS",
          formatAdaptiveForCoach(adaptiveFiltered, mode)
        );
      }
    } catch {
      if (needs.dailyIntel || needs.weeklyIntel) {
        pushSection(lines, "INTELLIGENCE", ["Intelligence-Daten: nicht verfügbar"]);
      }
    }
  }

  if (needs.nutritionPerformance) {
    try {
      const perfCtx = await loadNutritionPerformanceContext(userId, {
        ...(nutrition ? { dashboard: nutrition } : {}),
        ...(needs.savedMeals ? { savedMeals } : {}),
        nutritionGoal: profile?.nutritionGoal ?? nutrition?.targets?.nutritionGoal ?? null,
        weeklyNutrition: weeklyIntel?.nutrition ?? null,
      });
      const nutritionPerf = buildNutritionPerformanceIntelligence(perfCtx);
      pushSection(
        lines,
        mode === "general" ? "NUTRITION" : "NUTRITION INTELLIGENCE",
        formatNutritionPerformanceForCoach(nutritionPerf, mode === "general" || mode === "weekly")
      );
    } catch {
      pushSection(lines, "NUTRITION INTELLIGENCE", ["Ernährungs-Performance: nicht verfügbar"]);
    }
  }

  if (needs.dailyPlan && (dailyIntel || weeklyIntel || adaptiveFiltered)) {
    try {
      const plan = buildDailyActionPlanFromHome(
        {
          intelligence: dailyIntel,
          weeklyIntelligence: weeklyIntel,
          adaptiveRecommendations: adaptiveFiltered,
          nutrition: nutrition ?? undefined,
          nextWorkout: training?.nextWorkout ?? null,
          activeSession: training?.activeSession ?? null,
          healthToday: healthToday
            ? {
                steps: healthToday.steps ?? 0,
                stepGoal: 10000,
                activeMinutes: 0,
                activeMinuteGoal: 30,
                caloriesBurned: 0,
                distanceM: 0,
                stepStreak: 0,
                recoveryScore: healthToday.recoveryScore,
                trainingReadiness: healthToday.trainingReadiness,
              }
            : null,
          proteinTarget: profile?.proteinTargetG ?? 0,
          proteinRemaining: nutrition?.remaining.proteinG ?? 0,
          proteinConsumed: nutrition?.consumed.proteinG ?? 0,
          calorieTarget: profile?.calorieTarget ?? 0,
          caloriesRemaining: nutrition?.remaining.calories ?? 0,
          caloriesIntake: nutrition?.consumed.calories ?? 0,
          coach: { summary: "", tips: [] },
          activityWeek: { count: 0, totalDistanceM: 0 },
          weightKg: profile?.weightKg ?? null,
          streak: null,
          trainingStreak: null,
          nutritionStreak: null,
        },
        { savedMeals: needs.savedMeals ? savedMeals : undefined }
      );
      pushSection(
        lines,
        "DAILY ACTION PLAN",
        formatDailyActionPlanForCoach(plan, true)
      );
    } catch {
      pushSection(lines, "DAILY ACTION PLAN", ["Tagesplan: nicht verfügbar"]);
    }
  }

  return {
    mode,
    contextText: lines.join("\n"),
    actions: actionsWithSavedMeals(mode, savedMeals),
  };
}

/** @deprecated Prefer buildPersonalCoachContext */
export async function buildSelectiveCoachContext(
  userId: string,
  message: string,
  hint?: CoachContextMode | null
): Promise<CoachContextBuildResult> {
  return buildPersonalCoachContext(userId, message, hint);
}

export async function buildCoachUserContext(userId: string): Promise<string> {
  const { contextText } = await buildPersonalCoachContext(
    userId,
    "allgemeiner status",
    "general"
  );
  return contextText;
}
