export const WEEKDAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

type DayWithExercises = { id: string; dayOrder: number; exercises: unknown[] };

/** Only active training days — no rest / empty days */
export function filterTrainingDays<T extends DayWithExercises>(days: T[]): T[] {
  return [...days]
    .filter((d) => d.exercises.length > 0)
    .sort((a, b) => a.dayOrder - b.dayOrder);
}

export function weekdayLabelForDay(dayOrder: number): string {
  return WEEKDAY_SHORT[dayOrder % 7] ?? "Mo";
}
