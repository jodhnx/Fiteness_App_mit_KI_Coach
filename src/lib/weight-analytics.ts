import {
  format,
  startOfDay,
  subDays,
  startOfWeek,
  differenceInWeeks,
} from "date-fns";
import { de } from "date-fns/locale";
import { computeWeightGoalProgress, type WeightGoalProgress } from "@/lib/smart-goals";

export type WeightEntry = { date: string; weightKg: number };

export type WeightPeriod = "today" | "7d" | "30d" | "90d" | "180d" | "365d" | "all";

export type WeightAnalytics = {
  currentKg: number | null;
  changeWeekKg: number | null;
  changeMonthKg: number | null;
  avgChangePerWeekKg: number | null;
  weeklyAverages: { label: string; value: number }[];
  chartPoints: { label: string; value: number; trend: number }[];
  goal: WeightGoalProgress | null;
};

function parseEntries(
  entries: { date: string | Date; weightKg?: number | null }[]
): WeightEntry[] {
  return entries
    .filter((e) => e.weightKg != null && Number.isFinite(e.weightKg))
    .map((e) => ({
      date: typeof e.date === "string" ? e.date : e.date.toISOString(),
      weightKg: e.weightKg!,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function filterByPeriod(entries: WeightEntry[], period: WeightPeriod): WeightEntry[] {
  if (period === "all") return entries;
  const now = startOfDay(new Date());
  const days =
    period === "today"
      ? 0
      : period === "7d"
        ? 7
        : period === "30d"
          ? 30
          : period === "90d"
            ? 90
            : period === "180d"
              ? 180
              : period === "365d"
                ? 365
                : 90;
  const from = subDays(now, days);
  return entries.filter((e) => startOfDay(new Date(e.date)) >= from);
}

function linearTrend(values: number[]): number[] {
  if (values.length < 2) return values.map(() => values[0] ?? 0);
  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return values.map((_, i) => Math.round((intercept + slope * i) * 10) / 10);
}

function weeklyAverages(entries: WeightEntry[]): { label: string; value: number }[] {
  const buckets = new Map<string, number[]>();
  for (const e of entries) {
    const wk = startOfWeek(new Date(e.date), { weekStartsOn: 1 });
    const key = format(wk, "yyyy-MM-dd");
    const arr = buckets.get(key) ?? [];
    arr.push(e.weightKg);
    buckets.set(key, arr);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, vals]) => ({
      label: format(new Date(key), "dd.MM", { locale: de }),
      value: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
    }));
}

function changeBetween(
  entries: WeightEntry[],
  daysBack: number
): number | null {
  if (entries.length < 1) return null;
  const latest = entries[entries.length - 1];
  const cutoff = subDays(startOfDay(new Date()), daysBack);
  const past = entries.filter((e) => startOfDay(new Date(e.date)) <= cutoff);
  const ref = past.length > 0 ? past[past.length - 1] : entries[0];
  if (!ref) return null;
  return Math.round((latest.weightKg - ref.weightKg) * 10) / 10;
}

export function buildWeightAnalytics(
  entriesRaw: { date: string | Date; weightKg?: number | null }[],
  period: WeightPeriod,
  profile: {
    weightKg: number | null;
    targetWeightKg: number | null;
    targetWeightDate: Date | null;
  } | null,
  startWeightKg?: number | null
): WeightAnalytics {
  const all = parseEntries(entriesRaw);
  const filtered = filterByPeriod(all, period);
  const values = filtered.map((e) => e.weightKg);
  const trend = linearTrend(values);

  const chartPoints = filtered.map((e, i) => ({
    label: format(new Date(e.date), period === "all" || filtered.length > 14 ? "dd.MM" : "dd.MM.yy", {
      locale: de,
    }),
    value: e.weightKg,
    trend: trend[i] ?? e.weightKg,
  }));

  const currentKg = all.length > 0 ? all[all.length - 1].weightKg : profile?.weightKg ?? null;

  let avgChangePerWeekKg: number | null = null;
  if (all.length >= 2) {
    const first = all[0];
    const last = all[all.length - 1];
    const weeks = Math.max(1, differenceInWeeks(new Date(last.date), new Date(first.date)));
    avgChangePerWeekKg = Math.round(((last.weightKg - first.weightKg) / weeks) * 10) / 10;
  }

  const goal =
    profile && computeWeightGoalProgress(profile, startWeightKg ?? all[0]?.weightKg ?? null);

  return {
    currentKg: currentKg != null ? Math.round(currentKg * 10) / 10 : null,
    changeWeekKg: changeBetween(all, 7),
    changeMonthKg: changeBetween(all, 30),
    avgChangePerWeekKg,
    weeklyAverages: weeklyAverages(filterByPeriod(all, period === "today" ? "7d" : period)),
    chartPoints,
    goal,
  };
}
