/**
 * Nutrition calendar day — user-local yyyy-MM-dd, stored as UTC midnight of that date.
 * Do not use process-local startOfDay() for "today" on the server (Vercel = UTC).
 */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseNutritionDayYmd(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 10);
  return YMD.test(trimmed) ? trimmed : null;
}

/** Local calendar day of `date` in the current runtime (browser = user TZ). */
export function nutritionDayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** UTC midnight for a calendar yyyy-MM-dd — stable meal/water DateTime key. */
export function nutritionDayUtc(ymd: string): Date {
  const m = YMD.exec(ymd);
  if (!m) return nutritionDayUtc(nutritionDayKey());
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function formatNutritionDayUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isNutritionDashboardToday(
  dashboardDate: string | undefined,
  now = new Date()
): boolean {
  return dashboardDate === nutritionDayKey(now);
}

/**
 * Local calendar day as a UTC timestamp window.
 * tzOffsetMinutes is Date#getTimezoneOffset() (minutes west of UTC).
 */
export function localDayRangeUtc(
  ymd: string,
  tzOffsetMinutes: number
): { from: Date; to: Date } {
  const utcMidnight = nutritionDayUtc(ymd);
  const from = new Date(utcMidnight.getTime() + tzOffsetMinutes * 60_000);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { from, to };
}

export type ResolvedNutritionDay = {
  ymd: string;
  date: Date;
  rangeFrom: Date;
  rangeTo: Date;
};

export function resolveNutritionDay(input?: {
  day?: string | null;
  date?: string | null;
  tzOffset?: string | number | null;
}): ResolvedNutritionDay {
  const ymd =
    parseNutritionDayYmd(input?.day) ??
    parseNutritionDayYmd(input?.date) ??
    nutritionDayKey();
  const date = nutritionDayUtc(ymd);
  const tzRaw = input?.tzOffset;
  const tzOffset =
    tzRaw == null || tzRaw === ""
      ? 0
      : typeof tzRaw === "number"
        ? tzRaw
        : Number.parseInt(String(tzRaw), 10);
  const offset = Number.isFinite(tzOffset) ? tzOffset : 0;
  const { from, to } = localDayRangeUtc(ymd, offset);
  return { ymd, date, rangeFrom: from, rangeTo: to };
}

/** Client query for bootstrap / dashboard — local day + TZ offset. */
export function nutritionDayQueryString(now = new Date()): string {
  return `day=${encodeURIComponent(nutritionDayKey(now))}&tzOffset=${now.getTimezoneOffset()}`;
}
