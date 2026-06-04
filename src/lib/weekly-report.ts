import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  subWeeks,
  format,
  getDay,
  endOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";

export type WeeklyReport = {
  weekLabel: string;
  generatedAt: string;
  workouts: number;
  avgProteinG: number;
  avgCaloriesKcal: number;
  proteinDaysOnTarget: number;
  proteinDaysTotal: number;
  totalSteps: number;
  avgSleepHours: number | null;
  sleepNightsLogged: number;
  activityCount: number;
  weightChangeKg: number | null;
  goalReached: boolean;
  summaryLine: string;
  aiSummary: string;
};

function generateAiSummary(r: {
  workouts: number;
  avgProteinG: number;
  proteinDaysOnTarget: number;
  proteinDaysTotal: number;
  weightChangeKg: number | null;
  totalSteps: number;
  avgSleepHours: number | null;
  goalReached: boolean;
  activityCount: number;
}): string {
  const parts: string[] = [];
  if (r.workouts >= 4) parts.push("Sehr gute Trainingswoche.");
  else if (r.workouts >= 2) parts.push("Solide Trainingswoche.");
  else parts.push("Wenig Training diese Woche – plane 2–3 Einheiten ein.");

  if (r.proteinDaysTotal > 0) {
    parts.push(
      `Dein Proteinziel wurde an ${r.proteinDaysOnTarget} von ${r.proteinDaysTotal} Tagen erreicht (Ø ${r.avgProteinG}g).`
    );
  }

  if (r.weightChangeKg != null) {
    const w = r.weightChangeKg;
    if (w > 0.2) parts.push(`Gewicht +${w} kg – für Muskelaufbau kann das passen, für Fettabbau Kalorien prüfen.`);
    else if (w < -0.2) parts.push(`Gewicht ${w} kg – die Entwicklung passt gut zum Abnahmeziel.`);
    else parts.push("Gewicht stabil – gut für Recomposition.");
  }

  if (r.avgSleepHours != null && r.avgSleepHours < 6.5) {
    parts.push("Schlaf war unter dem Optimum – Regeneration und Intensität anpassen.");
  } else if (r.avgSleepHours != null && r.avgSleepHours >= 7.5) {
    parts.push("Guter Schlaf unterstützt deine Regeneration.");
  }

  if (r.totalSteps >= 50000) parts.push(`${Math.round(r.totalSteps / 1000)}k Schritte – stark aktiv.`);
  if (r.goalReached) parts.push("Wochenziel erreicht – weiter so!");
  if (r.activityCount > 0) parts.push(`${r.activityCount} Ausdauer-Aktivität(en) ergänzen dein Training.`);

  return parts.join(" ");
}

export async function buildWeeklyReport(userId: string): Promise<WeeklyReport> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekLabel = `KW ${format(weekStart, "w", { locale: de })}`;

  const [
    workouts,
    profile,
    stepsRows,
    progressEntries,
    proteinByDay,
    calorieByDay,
    activities,
    sleepRows,
  ] = await Promise.all([
    prisma.workoutSession.count({
      where: { userId, status: "COMPLETED", completedAt: { gte: weekStart } },
    }),
    prisma.profile.findUnique({
      where: { userId },
      select: {
        proteinTargetG: true,
        targetWeightKg: true,
        weightKg: true,
        calorieTarget: true,
      },
    }),
    prisma.dailyHealthMetric
      .findMany({
        where: { userId, date: { gte: weekStart } },
        select: { steps: true, sleepHours: true },
      })
      .catch(() => [] as { steps: number; sleepHours: number | null }[]),
    prisma.progressEntry.findMany({
      where: { userId, date: { gte: subWeeks(weekStart, 2) } },
      orderBy: { date: "asc" },
      select: { date: true, weightKg: true },
    }),
    prisma.mealItem.findMany({
      where: { meal: { userId, date: { gte: weekStart } } },
      select: {
        quantityG: true,
        foodItem: { select: { proteinG: true, calories: true, servingG: true } },
        meal: { select: { date: true } },
      },
    }),
    prisma.mealItem.findMany({
      where: { meal: { userId, date: { gte: weekStart } } },
      select: {
        quantityG: true,
        foodItem: { select: { calories: true, servingG: true } },
        meal: { select: { date: true } },
      },
    }),
    prisma.enduranceActivity.count({
      where: { userId, startedAt: { gte: weekStart } },
    }),
    prisma.dailyHealthMetric
      .findMany({
        where: { userId, date: { gte: weekStart }, sleepHours: { not: null } },
        select: { sleepHours: true },
      })
      .catch(() => [] as { sleepHours: number | null }[]),
  ]);

  const totalSteps = stepsRows.reduce((s, r) => s + r.steps, 0);
  const proteinTarget = profile?.proteinTargetG ?? 150;

  const dayProtein = new Map<string, number>();
  for (const item of proteinByDay) {
    const key = item.meal.date.toISOString().slice(0, 10);
    const serving = item.foodItem.servingG || 100;
    const protein = (item.foodItem.proteinG * item.quantityG) / serving;
    dayProtein.set(key, (dayProtein.get(key) ?? 0) + protein);
  }
  const dayValues = [...dayProtein.values()];
  const avgProteinG =
    dayValues.length > 0
      ? Math.round(dayValues.reduce((a, b) => a + b, 0) / dayValues.length)
      : 0;
  const proteinDaysOnTarget = dayValues.filter((p) => p >= proteinTarget * 0.9).length;
  const proteinDaysTotal = dayValues.length;

  const dayCal = new Map<string, number>();
  for (const item of calorieByDay) {
    const key = item.meal.date.toISOString().slice(0, 10);
    const serving = item.foodItem.servingG || 100;
    const cal = (item.foodItem.calories * item.quantityG) / serving;
    dayCal.set(key, (dayCal.get(key) ?? 0) + cal);
  }
  const calValues = [...dayCal.values()];
  const avgCaloriesKcal =
    calValues.length > 0
      ? Math.round(calValues.reduce((a, b) => a + b, 0) / calValues.length)
      : profile?.calorieTarget ?? 0;

  const sleepLogged = sleepRows.filter((r) => r.sleepHours != null && r.sleepHours > 0);
  const avgSleepHours =
    sleepLogged.length > 0
      ? Math.round(
          (sleepLogged.reduce((s, r) => s + (r.sleepHours ?? 0), 0) / sleepLogged.length) * 10
        ) / 10
      : stepsRows.some((r) => (r as { sleepHours?: number }).sleepHours)
        ? null
        : null;

  const weekWeights = progressEntries.filter(
    (e) => e.weightKg != null && e.date >= weekStart
  );
  const beforeWeek = progressEntries.filter(
    (e) => e.weightKg != null && e.date < weekStart
  );
  let weightChangeKg: number | null = null;
  if (weekWeights.length >= 1) {
    const latest = weekWeights[weekWeights.length - 1].weightKg!;
    const baseline = beforeWeek.length
      ? beforeWeek[beforeWeek.length - 1].weightKg!
      : weekWeights[0].weightKg!;
    weightChangeKg = Math.round((latest - baseline) * 10) / 10;
  }

  const goalReached =
    profile?.targetWeightKg != null &&
    profile.weightKg != null &&
    Math.abs(profile.weightKg - profile.targetWeightKg) < 0.5;

  const summaryLine = goalReached
    ? "Ziel erreicht"
    : `${workouts} Trainings · Ø ${avgProteinG}g Protein`;

  const core = {
    workouts,
    avgProteinG,
    proteinDaysOnTarget,
    proteinDaysTotal,
    weightChangeKg,
    totalSteps,
    avgSleepHours,
    goalReached,
    activityCount: activities,
  };

  const aiSummary = generateAiSummary(core);

  return {
    weekLabel,
    generatedAt: format(getDay(now) === 0 ? now : weekEnd, "dd.MM.yyyy", { locale: de }),
    avgCaloriesKcal,
    sleepNightsLogged: sleepLogged.length,
    summaryLine,
    aiSummary,
    ...core,
  };
}
