import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";
import { de } from "date-fns/locale";
import { setVolume } from "@/lib/workout-metrics";

export async function loadProgressDashboardExtras(userId: string) {
  const today = startOfDay(new Date());
  const since90 = subDays(today, 89);

  const [
    meals90,
    profile,
    sessionsForCharts,
    recentSessions,
    trainingStreak,
    activeStreak,
    prs,
    recentAchievements,
    achievementCount,
    unlockedCount,
  ] = await Promise.all([
    prisma.meal.findMany({
      where: { userId, date: { gte: since90 } },
      select: {
        date: true,
        items: {
          select: {
            quantityG: true,
            foodItem: {
              select: {
                calories: true,
                proteinG: true,
                servingG: true,
              },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.profile.findUnique({
      where: { userId },
      select: { calorieTarget: true, proteinTargetG: true },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: "COMPLETED", completedAt: { gte: since90 } },
      orderBy: { completedAt: "asc" },
      select: {
        id: true,
        name: true,
        completedAt: true,
        durationSec: true,
        caloriesBurned: true,
        day: { select: { name: true } },
        sets: { select: { reps: true, weightKg: true } },
      },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        completedAt: true,
        durationSec: true,
        caloriesBurned: true,
        day: { select: { name: true } },
      },
    }),
    prisma.trainingStreak.findUnique({
      where: { userId },
      select: { currentDays: true, longestDays: true },
    }),
    prisma.streak.findUnique({
      where: { userId },
      select: { currentDays: true, longestDays: true },
    }),
    prisma.personalRecord.findMany({
      where: { userId },
      orderBy: { achievedAt: "desc" },
      take: 6,
      include: { exercise: { select: { name: true } } },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
      take: 5,
      include: { achievement: { select: { name: true, icon: true, tier: true, xpReward: true } } },
    }),
    prisma.achievement.count(),
    prisma.userAchievement.count({ where: { userId } }),
  ]);

  const byDay = new Map<string, { calories: number; proteinG: number }>();
  for (const meal of meals90) {
    const key = format(meal.date, "yyyy-MM-dd");
    let calories = 0;
    let proteinG = 0;
    for (const item of meal.items) {
      const s = item.foodItem.servingG || 100;
      const factor = item.quantityG / s;
      calories += item.foodItem.calories * factor;
      proteinG += item.foodItem.proteinG * factor;
    }
    const prev = byDay.get(key) ?? { calories: 0, proteinG: 0 };
    byDay.set(key, {
      calories: prev.calories + calories,
      proteinG: prev.proteinG + proteinG,
    });
  }

  const nutritionTrend = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      label: format(new Date(date), "dd.MM", { locale: de }),
      calories: Math.round(v.calories),
      proteinG: Math.round(v.proteinG),
    }));

  const trainingVolumeTrend = sessionsForCharts.map((s) => {
    const date = s.completedAt!.toISOString().slice(0, 10);
    let vol = 0;
    for (const set of s.sets) vol += setVolume(set.reps, set.weightKg);
    return {
      date,
      label: format(s.completedAt!, "dd.MM", { locale: de }),
      value: Math.round(vol),
    };
  });

  const trainingFrequencyTrend = sessionsForCharts.map((s) => ({
    date: s.completedAt!.toISOString().slice(0, 10),
    label: format(s.completedAt!, "dd.MM", { locale: de }),
    value: 1,
  }));

  return {
    nutritionTrend,
    calorieTarget: profile?.calorieTarget ?? 0,
    proteinTargetG: profile?.proteinTargetG ?? 0,
    trainingVolumeTrend,
    trainingFrequencyTrend,
    trainingHistory: recentSessions.map((s) => ({
      id: s.id,
      name: s.name,
      dayName: s.day?.name ?? null,
      completedAt: s.completedAt?.toISOString() ?? null,
      durationMin: s.durationSec ? Math.round(s.durationSec / 60) : null,
      caloriesBurned: s.caloriesBurned,
    })),
    streaks: {
      training: trainingStreak,
      active: activeStreak,
    },
    personalRecords: prs.map((pr) => ({
      id: pr.id,
      exerciseName: pr.exercise.name,
      recordType: pr.recordType,
      value: pr.value,
      reps: pr.reps,
      achievedAt: pr.achievedAt.toISOString(),
    })),
    achievements: {
      unlocked: unlockedCount,
      total: achievementCount,
      recent: recentAchievements.map((ua) => ({
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        tier: ua.achievement.tier,
        xpReward: ua.achievement.xpReward,
        earnedAt: ua.earnedAt.toISOString(),
      })),
    },
  };
}
