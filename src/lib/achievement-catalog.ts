export type BadgeTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "mythic"
  | "legendary";

import { bulkAchievementDefinitions } from "@/data/achievement-catalog-bulk";

export type AchievementSeed = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  tier: BadgeTier;
  targetValue: number;
  metricKey: string;
  sortOrder: number;
};

function tierForIndex(i: number, max: number): BadgeTier {
  const r = i / Math.max(1, max - 1);
  if (r >= 0.97) return "legendary";
  if (r >= 0.88) return "mythic";
  if (r >= 0.75) return "diamond";
  if (r >= 0.58) return "platinum";
  if (r >= 0.4) return "gold";
  if (r >= 0.2) return "silver";
  return "bronze";
}

function workoutAchievements(): AchievementSeed[] {
  const counts = [1, 2, 5, 10, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
  return counts.map((n, i) => ({
    slug: `workouts-${n}`,
    name: n === 1 ? "Erstes Training" : `${n} Trainings`,
    description:
      n === 1 ? "Dein erstes Workout ist in der Büchse." : `${n} abgeschlossene Workouts`,
    icon: n >= 500 ? "👑" : n >= 100 ? "🏆" : n >= 10 ? "💪" : "🏋️",
    xpReward: Math.min(500, 40 + Math.floor(n / 2)),
    category: "training",
    tier: tierForIndex(i, counts.length),
    targetValue: n,
    metricKey: "workouts_completed",
    sortOrder: 100 + i,
  }));
}

function nutritionAchievements(): AchievementSeed[] {
  const items: AchievementSeed[] = [];
  const proteinDays = [3, 7, 14, 21, 30, 60, 90, 180];
  proteinDays.forEach((n, i) => {
    items.push({
      slug: `protein-streak-${n}`,
      name: `Protein ${n} Tage`,
      description: `Proteinziel an ${n} Tagen erreicht (Streak)`,
      icon: "🥩",
      xpReward: 30 + n,
      category: "nutrition",
      tier: tierForIndex(i, proteinDays.length),
      targetValue: n,
      metricKey: "protein_goal_days_streak",
      sortOrder: 200 + i,
    });
  });
  const meals = [1, 10, 25, 50, 100, 250, 500, 1000, 2000];
  meals.forEach((n, i) => {
    items.push({
      slug: `meals-logged-${n}`,
      name: n === 1 ? "Erste Mahlzeit" : `${n} Mahlzeiten`,
      description: `${n} Mahlzeiten erfasst`,
      icon: "🍽️",
      xpReward: Math.min(300, 15 + Math.floor(n / 10)),
      category: "nutrition",
      tier: tierForIndex(i, meals.length),
      targetValue: n,
      metricKey: "meals_logged",
      sortOrder: 220 + i,
    });
  });
  const calDays = [1, 7, 30];
  calDays.forEach((n, i) => {
    items.push({
      slug: `calorie-goal-${n}d`,
      name: `Kalorienziel ${n}d`,
      description: `Kalorienziel an ${n} Tag(en) im Zielbereich`,
      icon: "🔥",
      xpReward: 25 + n * 5,
      category: "nutrition",
      tier: tierForIndex(i, calDays.length),
      targetValue: n,
      metricKey: "calorie_goal_days",
      sortOrder: 240 + i,
    });
  });
  const waterDays = [3, 7, 14, 30];
  waterDays.forEach((n, i) => {
    items.push({
      slug: `water-3l-${n}d`,
      name: `Hydration ${n}d`,
      description: `${n} Tage mit mind. 3L Wasser`,
      icon: "💧",
      xpReward: 20 + n * 3,
      category: "nutrition",
      tier: tierForIndex(i, waterDays.length),
      targetValue: n,
      metricKey: "water_3l_days",
      sortOrder: 250 + i,
    });
  });
  return items;
}

function stepsAchievements(): AchievementSeed[] {
  const items: AchievementSeed[] = [];
  const daySteps = [5000, 10000, 15000, 20000, 25000];
  daySteps.forEach((n, i) => {
    items.push({
      slug: `steps-day-${n}`,
      name: `${(n / 1000).toFixed(0)}k Schritte`,
      description: `An einem Tag ${n.toLocaleString("de-DE")} Schritte`,
      icon: "👟",
      xpReward: 20 + i * 15,
      category: "activity",
      tier: tierForIndex(i, daySteps.length),
      targetValue: n,
      metricKey: "steps_single_day",
      sortOrder: 300 + i,
    });
  });
  const totals = [25000, 50000, 100000, 250000, 500000, 1000000];
  totals.forEach((n, i) => {
    items.push({
      slug: `steps-total-${n}`,
      name: `${Math.round(n / 1000)}k gesamt`,
      description: `${n.toLocaleString("de-DE")} Schritte insgesamt erfasst`,
      icon: "🚶",
      xpReward: 40 + i * 25,
      category: "activity",
      tier: tierForIndex(i, totals.length),
      targetValue: n,
      metricKey: "steps_total",
      sortOrder: 310 + i,
    });
  });
  const weekSteps = [35000, 50000, 70000, 100000];
  weekSteps.forEach((n, i) => {
    items.push({
      slug: `steps-week-${n}`,
      name: `${Math.round(n / 1000)}k / Woche`,
      description: `In einer Woche ${n.toLocaleString("de-DE")} Schritte`,
      icon: "📈",
      xpReward: 50 + i * 20,
      category: "activity",
      tier: tierForIndex(i, weekSteps.length),
      targetValue: n,
      metricKey: "steps_week_max",
      sortOrder: 320 + i,
    });
  });
  return items;
}

function streakAchievements(): AchievementSeed[] {
  const days = [3, 7, 14, 21, 30, 60, 100, 180, 365];
  return days.map((n, i) => ({
    slug: `active-streak-${n}`,
    name: `${n} Tage aktiv`,
    description: `${n} Tage in Folge aktiv`,
    icon: n >= 365 ? "🌟" : "🔥",
    xpReward: 30 + Math.floor(n / 2),
    category: "streak",
    tier: tierForIndex(i, days.length),
    targetValue: n,
    metricKey: "active_streak_days",
    sortOrder: 400 + i,
  }));
}

function sleepAchievements(): AchievementSeed[] {
  const nights = [3, 7, 14, 30, 60];
  return nights.map((n, i) => ({
    slug: `sleep-8h-${n}d`,
    name: `8h Schlaf · ${n}d`,
    description: `${n} Nächte mit mind. 8 Stunden Schlaf`,
    icon: "😴",
    xpReward: 25 + n * 4,
    category: "sleep",
    tier: tierForIndex(i, nights.length),
    targetValue: n,
    metricKey: "sleep_8h_nights",
    sortOrder: 500 + i,
  }));
}

function weightAchievements(): AchievementSeed[] {
  const items: AchievementSeed[] = [];
  [5, 10, 15, 20, 25].forEach((kg, i) => {
    items.push({
      slug: `weight-lost-${kg}kg`,
      name: `${kg} kg abgenommen`,
      description: `${kg} kg zum Startgewicht verloren`,
      icon: "📉",
      xpReward: 50 + kg * 10,
      category: "weight",
      tier: tierForIndex(i, 5),
      targetValue: kg,
      metricKey: "weight_lost_kg",
      sortOrder: 600 + i,
    });
  });
  [3, 5, 10, 15].forEach((kg, i) => {
    items.push({
      slug: `weight-gained-${kg}kg`,
      name: `${kg} kg aufgebaut`,
      description: `${kg} kg zum Startgewicht zugenommen`,
      icon: "📈",
      xpReward: 50 + kg * 10,
      category: "weight",
      tier: tierForIndex(i, 4),
      targetValue: kg,
      metricKey: "weight_gained_kg",
      sortOrder: 610 + i,
    });
  });
  [7, 30, 90, 180].forEach((n, i) => {
    items.push({
      slug: `weight-log-${n}`,
      name: `Gewicht ${n}x`,
      description: `Gewicht ${n} Mal eingetragen`,
      icon: "⚖️",
      xpReward: 15 + n,
      category: "weight",
      tier: tierForIndex(i, 4),
      targetValue: n,
      metricKey: "weight_logs",
      sortOrder: 620 + i,
    });
  });
  return items;
}

function challengeAchievements(): AchievementSeed[] {
  const counts = [1, 3, 5, 10, 20, 30, 50];
  return counts.map((n, i) => ({
    slug: `challenges-done-${n}`,
    name: n === 1 ? "Erste Challenge" : `${n} Challenges`,
    description: `${n} Challenge(s) abgeschlossen`,
    icon: "🎯",
    xpReward: 50 + n * 25,
    category: "challenges",
    tier: tierForIndex(i, counts.length),
    targetValue: n,
    metricKey: "challenges_completed",
    sortOrder: 700 + i,
  }));
}

function nutritionTrackingStreakAchievements(): AchievementSeed[] {
  const days = [1, 7, 30, 100];
  return days.map((n, i) => ({
    slug: `nutrition-track-${n}d`,
    name: n === 1 ? "Erstes Tracking" : `${n} Tage Ernährung`,
    description:
      n === 1
        ? "Erstes Lebensmittel erfasst"
        : `${n} Tage mit Ernährungs-Tracking`,
    icon: "📓",
    xpReward: 25 + n * 8,
    category: "nutrition",
    tier: tierForIndex(i, days.length),
    targetValue: n,
    metricKey: "meals_logged_days_streak",
    sortOrder: 205 + i,
  }));
}

function proteinGramDayAchievements(): AchievementSeed[] {
  const grams = [100, 150, 200];
  return grams.map((g, i) => ({
    slug: `protein-day-${g}g`,
    name: `${g} g Protein`,
    description: `An einem Tag ${g} g Protein erreicht`,
    icon: "💪",
    xpReward: 40 + i * 20,
    category: "nutrition",
    tier: tierForIndex(i, grams.length),
    targetValue: g,
    metricKey: "protein_single_day_g",
    sortOrder: 215 + i,
  }));
}

function trainingStreakAchievements(): AchievementSeed[] {
  const days = [3, 7, 14, 30, 60, 90, 100];
  return days.map((n, i) => ({
    slug: `training-streak-${n}`,
    name: `Training ${n}d`,
    description: `${n} Tage Trainings-Streak`,
    icon: "🏋️‍♂️",
    xpReward: 40 + n * 5,
    category: "training",
    tier: tierForIndex(i, days.length),
    targetValue: n,
    metricKey: "training_streak_days",
    sortOrder: 110 + i,
  }));
}

function extraMilestones(): AchievementSeed[] {
  const items: AchievementSeed[] = [];
  const setVol = [10000, 50000, 100000, 250000, 500000];
  setVol.forEach((n, i) => {
    items.push({
      slug: `volume-kg-${n}`,
      name: `${(n / 1000).toFixed(0)}t Volumen`,
      description: `${n.toLocaleString("de-DE")} kg Trainingsvolumen gesamt`,
      icon: "⚡",
      xpReward: 60 + i * 40,
      category: "training",
      tier: tierForIndex(i, setVol.length),
      targetValue: n,
      metricKey: "training_volume_kg",
      sortOrder: 130 + i,
    });
  });
  for (let h = 1; h <= 10; h++) {
    items.push({
      slug: `workout-hours-${h * 10}`,
      name: `${h * 10}h Training`,
      description: `${h * 10} Stunden Trainingszeit`,
      icon: "⏱️",
      xpReward: 30 + h * 15,
      category: "training",
      tier: tierForIndex(h, 10),
      targetValue: h * 60,
      metricKey: "training_minutes",
      sortOrder: 140 + h,
    });
  }
  const fiberDays = [3, 7, 14];
  fiberDays.forEach((n, i) => {
    items.push({
      slug: `fiber-goal-${n}d`,
      name: `Ballaststoffe ${n}d`,
      description: `Ballaststoffziel an ${n} Tagen`,
      icon: "🥦",
      xpReward: 25 + n * 5,
      category: "nutrition",
      tier: tierForIndex(i, fiberDays.length),
      targetValue: n,
      metricKey: "fiber_goal_days",
      sortOrder: 260 + i,
    });
  });
  const coachChats = [1, 5, 20, 50];
  coachChats.forEach((n, i) => {
    items.push({
      slug: `coach-chats-${n}`,
      name: n === 1 ? "Coach gestartet" : `${n} Coach-Chats`,
      description: `${n} Nachrichten an den KI Coach`,
      icon: "🤖",
      xpReward: 20 + n * 10,
      category: "ai",
      tier: tierForIndex(i, coachChats.length),
      targetValue: n,
      metricKey: "coach_messages",
      sortOrder: 810 + i,
    });
  });
  return items;
}

function activityCountAchievements(): AchievementSeed[] {
  const counts = [1, 5, 10, 25, 50, 100];
  const countItems = counts.map((n, i) => ({
    slug: `activities-${n}`,
    name: n === 1 ? "Erste Cardio-Aktivität" : `${n} Cardio-Einheiten`,
    description: `${n} Cardio-Aktivitäten abgeschlossen`,
    icon: "🏃",
    xpReward: 20 + n * 3,
    category: "cardio",
    tier: tierForIndex(i, counts.length),
    targetValue: n,
    metricKey: "activities_completed",
    sortOrder: 330 + i,
  }));
  const kmTargets = [10, 50, 100, 500, 1000];
  const kmItems = kmTargets.map((n, i) => ({
    slug: `cardio-km-${n}`,
    name: `${n} km Cardio`,
    description: `${n} km Distanz durch Cardio`,
    icon: "🏁",
    xpReward: 40 + Math.round(n / 5),
    category: "cardio",
    tier: tierForIndex(i, kmTargets.length),
    targetValue: n,
    metricKey: "cardio_distance_km",
    sortOrder: 350 + i,
  }));
  return [...countItems, ...kmItems];
}

function levelAchievements(): AchievementSeed[] {
  const items: AchievementSeed[] = [];
  for (let level = 1; level <= 100; level++) {
    items.push({
      slug: `level-${level}`,
      name: `Level ${level}`,
      description: `Erreiche Level ${level} durch XP`,
      icon: level >= 90 ? "👑" : level >= 50 ? "⭐" : "🎖️",
      xpReward: 10 + level * 5,
      category: "level",
      tier: tierForIndex(level - 1, 100),
      targetValue: level,
      metricKey: "user_level",
      sortOrder: 900 + level,
    });
  }
  return items;
}

function miscAchievements(): AchievementSeed[] {
  return [
    {
      slug: "first-workout",
      name: "Erstes Training",
      description: "Erstes Workout protokolliert",
      icon: "🏋️",
      xpReward: 100,
      category: "training",
      tier: "bronze",
      targetValue: 1,
      metricKey: "workouts_completed",
      sortOrder: 1,
    },
    {
      slug: "ai-explorer",
      name: "KI Entdecker",
      description: "Ersten Chat mit dem Coach",
      icon: "🤖",
      xpReward: 75,
      category: "ai",
      tier: "bronze",
      targetValue: 1,
      metricKey: "coach_messages",
      sortOrder: 800,
    },
    {
      slug: "pr-first",
      name: "Erster Rekord",
      description: "Ersten Personal Record gesetzt",
      icon: "🥇",
      xpReward: 80,
      category: "training",
      tier: "silver",
      targetValue: 1,
      metricKey: "personal_records",
      sortOrder: 120,
    },
    {
      slug: "pr-10",
      name: "10 Rekorde",
      description: "10 Personal Records",
      icon: "🏅",
      xpReward: 150,
      category: "training",
      tier: "gold",
      targetValue: 10,
      metricKey: "personal_records",
      sortOrder: 121,
    },
    {
      slug: "pr-50",
      name: "50 Rekorde",
      description: "50 Personal Records",
      icon: "🏆",
      xpReward: 400,
      category: "training",
      tier: "diamond",
      targetValue: 50,
      metricKey: "personal_records",
      sortOrder: 122,
    },
  ];
}

export function getAllAchievementDefinitions(): AchievementSeed[] {
  const all = [
    ...miscAchievements(),
    ...workoutAchievements(),
    ...trainingStreakAchievements(),
    ...nutritionAchievements(),
    ...nutritionTrackingStreakAchievements(),
    ...proteinGramDayAchievements(),
    ...stepsAchievements(),
    ...streakAchievements(),
    ...sleepAchievements(),
    ...weightAchievements(),
    ...challengeAchievements(),
    ...activityCountAchievements(),
    ...extraMilestones(),
    ...levelAchievements(),
    ...bulkAchievementDefinitions(),
  ];
  const bySlug = new Map<string, AchievementSeed>();
  for (const a of all) {
    if (!bySlug.has(a.slug)) bySlug.set(a.slug, a);
  }
  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
}

export const ACHIEVEMENT_CATEGORIES = [
  { id: "training", label: "Training", icon: "🏋️" },
  { id: "streak", label: "Streaks", icon: "🔥" },
  { id: "activity", label: "Schritte", icon: "🚶" },
  { id: "cardio", label: "Cardio", icon: "🏃" },
  { id: "nutrition", label: "Ernährung", icon: "🍎" },
  { id: "weight", label: "Fortschritt", icon: "⚖️" },
  { id: "challenges", label: "Challenges", icon: "🏆" },
  { id: "sleep", label: "Schlaf", icon: "😴" },
  { id: "ai", label: "KI Coach", icon: "🤖" },
  { id: "level", label: "Meilensteine", icon: "⭐" },
] as const;

export const BADGE_TIER_LABELS: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silver: "Silber",
  gold: "Gold",
  platinum: "Platin",
  diamond: "Diamant",
  mythic: "Mythic",
  legendary: "Legendär",
};
