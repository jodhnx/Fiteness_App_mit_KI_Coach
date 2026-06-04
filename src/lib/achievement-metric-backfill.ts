/** Maps legacy achievement slugs to metricKey when DB value is null */
export function metricKeyFromSlug(slug: string, category: string): string {
  if (slug === "first-workout" || slug.startsWith("workout") || slug.startsWith("training-")) {
    return "workouts_completed";
  }
  if (slug.startsWith("pr-")) return "personal_records";
  if (slug.startsWith("volume-") || slug.startsWith("workout-hours")) {
    return slug.startsWith("volume-") ? "training_volume_kg" : "training_minutes";
  }
  if (slug.startsWith("meal") || slug === "nutrition-master") return "meals_logged";
  if (slug.startsWith("protein")) return "protein_goal_days_streak";
  if (slug.startsWith("calorie")) return "calorie_goal_days";
  if (slug.startsWith("water")) return "water_3l_days";
  if (slug.startsWith("fiber")) return "fiber_goal_days";
  if (slug.startsWith("steps-day") || slug.includes("steps-single")) return "steps_single_day";
  if (slug.startsWith("steps-week")) return "steps_week_max";
  if (slug.startsWith("steps-total") || slug.startsWith("steps-")) return "steps_total";
  if (slug.startsWith("active-streak") || slug === "streak-7") return "active_streak_days";
  if (slug.startsWith("sleep")) return "sleep_8h_nights";
  if (slug.startsWith("weight-lost")) return "weight_lost_kg";
  if (slug.startsWith("weight-gained")) return "weight_gained_kg";
  if (slug.startsWith("weight-log")) return "weight_logs";
  if (slug.startsWith("challenges")) return "challenges_completed";
  if (slug.startsWith("activities")) return "activities_completed";
  if (slug.startsWith("coach") || slug === "ai-explorer") return "coach_messages";

  switch (category) {
    case "nutrition":
      return "meals_logged";
    case "activity":
      return "steps_total";
    case "streak":
      return "active_streak_days";
    case "sleep":
      return "sleep_8h_nights";
    case "weight":
      return "weight_logs";
    case "challenges":
      return "challenges_completed";
    case "training":
      return "workouts_completed";
    default:
      return "workouts_completed";
  }
}

export function targetValueFromSlug(slug: string): number | null {
  const m = slug.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (slug.includes("kg") && slug.includes("lost")) return n;
  if (slug.includes("kg") && slug.includes("gained")) return n;
  if (slug.startsWith("steps-total") || slug.startsWith("steps-week")) return n * (slug.includes("week") ? 1 : 1000);
  if (slug.startsWith("steps-day")) return n;
  if (slug.startsWith("volume-")) return n;
  if (slug.startsWith("workout-hours")) return n * 60;
  if (slug.startsWith("workouts-") || slug === "ten-workouts") return n;
  if (slug.startsWith("meals-logged")) return n;
  return n > 0 ? n : null;
}
