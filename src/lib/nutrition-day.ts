import { format, startOfDay } from "date-fns";

export function nutritionDayKey(date = new Date()): string {
  return format(startOfDay(date), "yyyy-MM-dd");
}

export function isNutritionDashboardToday(dashboardDate: string | undefined): boolean {
  return dashboardDate === nutritionDayKey();
}
