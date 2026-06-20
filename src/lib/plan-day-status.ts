import { subDays } from "date-fns";

export type DayStatus = "completed" | "open" | "rest";

export const DAY_STATUS_GREEN = "#4CAF50";

export function resolveDayStatus(
  exerciseCount: number,
  completedDayIds: Set<string>,
  dayId: string
): DayStatus {
  if (exerciseCount === 0) return "rest";
  return completedDayIds.has(dayId) ? "completed" : "open";
}

export function buildCompletedDayIds(
  sessions: { workoutDayId: string | null; completedAt: Date | null }[],
  cycleDays = 14
): Set<string> {
  const since = subDays(new Date(), cycleDays);
  const ids = new Set<string>();
  for (const s of sessions) {
    if (!s.workoutDayId || !s.completedAt || s.completedAt < since) continue;
    ids.add(s.workoutDayId);
  }
  return ids;
}
