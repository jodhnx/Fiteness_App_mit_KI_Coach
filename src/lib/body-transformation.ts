import { computeWeightGoalProgress, type WeightGoalProgress } from "@/lib/smart-goals";
import { differenceInDays, format } from "date-fns";
import { de } from "date-fns/locale";

export type BodyTransformation = {
  startKg: number;
  currentKg: number;
  targetKg: number | null;
  diffKg: number;
  progressPercent: number;
  changeWeekKg: number | null;
  changeMonthKg: number | null;
  changeTotalKg: number | null;
  forecastText: string | null;
  goal: WeightGoalProgress | null;
};

export function buildBodyTransformation(
  startKg: number | null,
  currentKg: number | null,
  targetKg: number | null,
  targetDate: Date | null,
  entries: { date: string | Date; weightKg?: number | null }[]
): BodyTransformation | null {
  if (currentKg == null && startKg == null) return null;
  const sorted = entries
    .filter((e) => e.weightKg != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const start = startKg ?? sorted[0]?.weightKg ?? currentKg;
  const current = currentKg ?? sorted[sorted.length - 1]?.weightKg ?? start;
  if (start == null || current == null) return null;

  const goal =
    targetKg != null
      ? computeWeightGoalProgress(
          { weightKg: current, targetWeightKg: targetKg, targetWeightDate: targetDate },
          start
        )
      : null;

  const journey = targetKg != null ? targetKg - start : 0;
  let progressPercent = 0;
  if (targetKg != null && Math.abs(journey) >= 0.1) {
    progressPercent = Math.min(100, Math.max(0, Math.round(((current - start) / journey) * 100)));
  } else if (goal) {
    progressPercent = goal.percent;
  }

  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  const monthAgo = now - 30 * 86400000;
  const weekRef = sorted.filter((e) => new Date(e.date).getTime() <= weekAgo).pop();
  const monthRef = sorted.filter((e) => new Date(e.date).getTime() <= monthAgo).pop();

  const changeWeekKg = weekRef?.weightKg != null ? Math.round((current - weekRef.weightKg) * 10) / 10 : null;
  const changeMonthKg =
    monthRef?.weightKg != null ? Math.round((current - monthRef.weightKg) * 10) / 10 : null;
  const changeTotalKg = Math.round((current - start) * 10) / 10;

  let forecastText: string | null = null;
  if (goal && targetKg != null && goal.daysRemaining > 0) {
    const eta = new Date();
    eta.setDate(eta.getDate() + goal.daysRemaining);
    forecastText = `Bei aktuellem Tempo erreichst du ca. ${goal.targetKg} kg bis ${format(eta, "dd. MMM yyyy", { locale: de })}.`;
  }

  return {
    startKg: Math.round(start * 10) / 10,
    currentKg: Math.round(current * 10) / 10,
    targetKg: targetKg != null ? Math.round(targetKg * 10) / 10 : null,
    diffKg: Math.round((current - start) * 10) / 10,
    progressPercent,
    changeWeekKg,
    changeMonthKg,
    changeTotalKg,
    forecastText,
    goal,
  };
}
