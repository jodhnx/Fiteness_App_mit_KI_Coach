/**
 * Nutrition calendar helpers — month metadata + day cache keys.
 * Historical days use a separate cache key so today is never overwritten.
 */

import { nutritionDayKey } from "@/lib/nutrition-day";
import { NUTRITION_DASHBOARD_CACHE_KEY } from "@/lib/nutrition-sync";

export function nutritionDashboardCacheKeyForDay(ymd: string): string {
  const today = nutritionDayKey();
  if (ymd === today) return NUTRITION_DASHBOARD_CACHE_KEY;
  return `${NUTRITION_DASHBOARD_CACHE_KEY}:${ymd}`;
}

export function nutritionDayQueryForYmd(ymd: string, now = new Date()): string {
  return `day=${encodeURIComponent(ymd)}&tzOffset=${now.getTimezoneOffset()}`;
}

export function isNutritionToday(ymd: string, now = new Date()): boolean {
  return ymd === nutritionDayKey(now);
}

/** Build yyyy-MM-dd for a calendar cell. */
export function ymdFromParts(year: number, monthIndex0: number, day: number): string {
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseYearMonth(raw: string | null | undefined): {
  year: number;
  monthIndex0: number;
} | null {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null;
  const year = Number(raw.slice(0, 4));
  const monthIndex0 = Number(raw.slice(5, 7)) - 1;
  if (!Number.isFinite(year) || monthIndex0 < 0 || monthIndex0 > 11) return null;
  return { year, monthIndex0 };
}

export function yearMonthKey(year: number, monthIndex0: number): string {
  return `${year}-${String(monthIndex0 + 1).padStart(2, "0")}`;
}

/** Monday-first grid (ISO week) for a month — null = padding cell. */
export function buildMonthGrid(year: number, monthIndex0: number): (number | null)[] {
  const first = new Date(year, monthIndex0, 1);
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  // JS: 0=Sun … 6=Sat → Monday-first index
  const mondayIndex = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < mondayIndex; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const WEEKDAY_LABELS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export const MONTH_LABELS_DE = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;
