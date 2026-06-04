import { prisma } from "@/lib/prisma";
import { mergeActivityIntoTodayHealth } from "@/lib/activity-health";
import type { EnduranceActivityType } from "@prisma/client";
import { startOfWeek } from "date-fns";

export type ActivityInput = {
  type: EnduranceActivityType;
  durationSec: number;
  distanceM?: number;
  caloriesBurned?: number;
  avgSpeedKmh?: number;
  elevationM?: number;
  notes?: string;
  startedAt?: Date;
};

export function computeAvgSpeedKmh(distanceM: number | undefined, durationSec: number): number | null {
  if (!distanceM || distanceM <= 0 || durationSec <= 0) return null;
  const hours = durationSec / 3600;
  return Math.round((distanceM / 1000 / hours) * 10) / 10;
}

async function activitiesAvailable(): Promise<boolean> {
  try {
    await prisma.enduranceActivity.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function createActivity(userId: string, input: ActivityInput) {
  if (!(await activitiesAvailable())) {
    throw new Error(
      "Aktivitäten-Tabelle fehlt. Bitte Datenbank migrieren: npx prisma db push"
    );
  }
  const avgSpeedKmh =
    input.avgSpeedKmh ??
    computeAvgSpeedKmh(input.distanceM, input.durationSec) ??
    undefined;

  const activity = await prisma.enduranceActivity.create({
    data: {
      userId,
      type: input.type,
      durationSec: input.durationSec,
      distanceM: input.distanceM,
      caloriesBurned: input.caloriesBurned,
      avgSpeedKmh,
      elevationM: input.elevationM,
      notes: input.notes,
      startedAt: input.startedAt ?? new Date(),
    },
  });
  await mergeActivityIntoTodayHealth(userId, activity).catch(() => {});
  return activity;
}

export async function listActivities(userId: string, limit = 30) {
  if (!(await activitiesAvailable())) return [];
  return prisma.enduranceActivity.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });
}

export async function getActivityWeekSummary(userId: string) {
  if (!(await activitiesAvailable())) {
    return { count: 0, totalDurationSec: 0, totalDistanceM: 0, totalCalories: 0 };
  }
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const activities = await prisma.enduranceActivity.findMany({
    where: { userId, startedAt: { gte: weekStart } },
  });
  const totalDurationSec = activities.reduce((s, a) => s + a.durationSec, 0);
  const totalDistanceM = activities.reduce((s, a) => s + (a.distanceM ?? 0), 0);
  const totalCalories = activities.reduce((s, a) => s + (a.caloriesBurned ?? 0), 0);
  return {
    count: activities.length,
    totalDurationSec,
    totalDistanceM,
    totalCalories,
  };
}

export async function getRecentActivity(userId: string) {
  if (!(await activitiesAvailable())) return null;
  return prisma.enduranceActivity.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
  });
}
