import type { AchievementSeed, BadgeTier } from "@/lib/achievement-catalog";

function tierAt(i: number, max: number): BadgeTier {
  const r = i / Math.max(1, max - 1);
  if (r >= 0.97) return "legendary";
  if (r >= 0.88) return "mythic";
  if (r >= 0.75) return "diamond";
  if (r >= 0.58) return "platinum";
  if (r >= 0.4) return "gold";
  if (r >= 0.2) return "silver";
  return "bronze";
}

function milestone(
  base: Omit<AchievementSeed, "tier"> & { tier?: BadgeTier },
  i: number,
  max: number
): AchievementSeed {
  return { ...base, tier: base.tier ?? tierAt(i, max) };
}

/** 70+ additional achievements → catalog exceeds 200 total */
export function bulkAchievementDefinitions(): AchievementSeed[] {
  const items: AchievementSeed[] = [];

  const weightKg = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
  weightKg.forEach((n, i) => {
    items.push(
      milestone(
        {
          slug: `weight-lost-${n}kg`,
          name: `${n} kg leichter`,
          description: `${n} kg Gewichtsverlust seit Start`,
          icon: n >= 20 ? "🏆" : "⚖️",
          xpReward: 40 + n * 12,
          category: "weight",
          targetValue: n,
          metricKey: "weight_lost_kg",
          sortOrder: 500 + i,
        },
        i,
        weightKg.length
      )
    );
    items.push(
      milestone(
        {
          slug: `weight-gained-${n}kg`,
          name: `${n} kg Masse`,
          description: `${n} kg Zunahme seit Start`,
          icon: "💪",
          xpReward: 40 + n * 10,
          category: "weight",
          targetValue: n,
          metricKey: "weight_gained_kg",
          sortOrder: 520 + i,
        },
        i,
        weightKg.length
      )
    );
  });

  const mealDays = [7, 14, 21, 30, 45, 60, 90, 100, 180, 365];
  mealDays.forEach((n, i) => {
    items.push(
      milestone(
        {
          slug: `nutrition-track-${n}d`,
          name: `${n} Tage Ernährung`,
          description: `Ernährung an ${n} verschiedenen Tagen getrackt`,
          icon: n >= 100 ? "📊" : "🥗",
          xpReward: 25 + Math.floor(n / 2),
          category: "nutrition",
          targetValue: n,
          metricKey: "meals_logged",
          sortOrder: 200 + i,
        },
        i,
        mealDays.length
      )
    );
  });

  const proteinG = [80, 100, 120, 150, 175, 200, 225, 250, 300];
  proteinG.forEach((n, i) => {
    items.push(
      milestone(
        {
          slug: `protein-day-${n}g`,
          name: `${n}g Protein/Tag`,
          description: `${n} g Protein an einem Tag erreicht`,
          icon: "🥩",
          xpReward: 30 + i * 15,
          category: "nutrition",
          targetValue: n,
          metricKey: "protein_single_day_g",
          sortOrder: 240 + i,
        },
        i,
        proteinG.length
      )
    );
  });

  const stepsDay = [5000, 7500, 10000, 12500, 15000, 20000, 25000];
  stepsDay.forEach((n, i) => {
    items.push(
      milestone(
        {
          slug: `steps-day-${n}`,
          name: `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k Schritte`,
          description: `${n.toLocaleString("de-DE")} Schritte an einem Tag`,
          icon: "👟",
          xpReward: 20 + i * 12,
          category: "activity",
          targetValue: n,
          metricKey: "steps_single_day",
          sortOrder: 300 + i,
        },
        i,
        stepsDay.length
      )
    );
  });

  const streakDays = [3, 7, 14, 21, 30, 45, 60, 90, 100, 180, 365];
  streakDays.forEach((n, i) => {
    items.push(
      milestone(
        {
          slug: `active-streak-${n}d`,
          name: `${n}-Tage Streak`,
          description: `${n} Tage Aktiv-Streak`,
          icon: n >= 60 ? "🔥" : "✨",
          xpReward: 35 + n,
          category: "streak",
          targetValue: n,
          metricKey: "active_streak_days",
          sortOrder: 400 + i,
        },
        i,
        streakDays.length
      )
    );
  });

  const trainingHours = [10, 25, 50, 75, 100, 200, 300, 500];
  trainingHours.forEach((h, i) => {
    items.push(
      milestone(
        {
          slug: `training-hours-${h}`,
          name: `${h}h Trainingszeit`,
          description: `${h} Stunden Training insgesamt`,
          icon: "⏱️",
          xpReward: 50 + h * 2,
          category: "training",
          targetValue: h * 60,
          metricKey: "training_minutes",
          sortOrder: 150 + i,
        },
        i,
        trainingHours.length
      )
    );
  });

  const workouts = [10, 50, 100, 250, 500];
  workouts.forEach((n, i) => {
    if ([1, 2, 5].includes(n)) return;
    items.push(
      milestone(
        {
          slug: `workouts-milestone-${n}`,
          name: `${n} Workouts`,
          description: `${n} abgeschlossene Trainingseinheiten`,
          icon: "🏋️",
          xpReward: 50 + n,
          category: "training",
          targetValue: n,
          metricKey: "workouts_completed",
          sortOrder: 105 + i,
        },
        i,
        workouts.length
      )
    );
  });

  const calorieDays = [3, 7, 14, 30, 60];
  calorieDays.forEach((n, i) => {
    items.push(
      milestone(
        {
          slug: `calorie-goal-${n}d`,
          name: `Kalorienziel ${n}d`,
          description: `Kalorienziel an ${n} Tagen erreicht`,
          icon: "🔥",
          xpReward: 30 + n * 5,
          category: "nutrition",
          targetValue: n,
          metricKey: "calorie_goal_days",
          sortOrder: 270 + i,
        },
        i,
        calorieDays.length
      )
    );
  });

  return items;
}
