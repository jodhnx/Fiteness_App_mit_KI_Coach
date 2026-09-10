/**
 * Daily kilocalorie sanitization.
 *
 * Wearables and manual inputs sometimes store millicalories, kJ, or
 * locale-stripped integers (e.g. "145.284" → 145284). Remaining kcal
 * must never be derived from those raw values.
 */

/** Physiological band for a daily calorie *target*. */
export const MIN_DAILY_CALORIE_TARGET = 800;
export const MAX_DAILY_CALORIE_TARGET = 10_000;

/** Hard ceiling for *exercise* kcal credited back to remaining in one day. */
const MAX_DAILY_EXERCISE_KCAL = 15_000;

function asFinite(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Convert a stored energy figure to kilocalories.
 * Values in the 20k–10M band are treated as millicalories (common Health API unit).
 */
export function coerceToKilocalories(raw: unknown): number {
  const n = asFinite(raw);
  if (n === 0) return 0;
  if (n >= 20_000 && n <= 10_000_000) {
    const asKcal = n / 1000;
    if (asKcal <= MAX_DAILY_EXERCISE_KCAL) return Math.round(asKcal);
  }
  return Math.round(n);
}

export function isPlausibleDailyCalorieTarget(raw: unknown): boolean {
  const n = coerceToKilocalories(raw);
  return n >= MIN_DAILY_CALORIE_TARGET && n <= MAX_DAILY_CALORIE_TARGET;
}

/** Persisted profile.calorieTarget — null means "ignore, use computed plan". */
export function sanitizeCalorieTarget(raw: unknown): number | null {
  const n = coerceToKilocalories(raw);
  if (n < MIN_DAILY_CALORIE_TARGET || n > MAX_DAILY_CALORIE_TARGET) return null;
  return n;
}

/** Exercise / wearable burn credited to remaining. */
export function sanitizeExerciseKcal(raw: unknown): number {
  const n = coerceToKilocalories(raw);
  if (n > MAX_DAILY_EXERCISE_KCAL) return 0;
  return n;
}

/**
 * Parse a manual kcal field. Accepts German thousands ("2.400") and
 * rejects values outside the daily target band.
 */
export function parseManualCalorieTargetInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return sanitizeCalorieTarget(n);
}
