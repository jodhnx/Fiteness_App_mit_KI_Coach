import { prisma } from "@/lib/prisma";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { profileToMetricsInput, calculateBMI } from "@/lib/profile-calculations";
import {
  TRAINING_GOAL_LABELS,
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
} from "@/lib/profile-calculations";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import { startOfDay } from "date-fns";
import { getActivityWeekSummary } from "@/lib/activity-service";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";
import { loadMuscleRecovery } from "@/lib/recovery-service";
import { loadHealthDashboard } from "@/lib/activity-health";

export async function buildCoachUserContext(userId: string): Promise<string> {
  const today = startOfDay(new Date());
  const [profile, nutrition, training, activityWeek, recentSessions, goals, user, recovery, health] =
    await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      loadNutritionDashboard(userId, today).catch(() => null),
      loadTrainingSnapshot(userId).catch(() => null),
      getActivityWeekSummary(userId).catch(() => null),
      prisma.workoutSession.findMany({
        where: { userId, status: "COMPLETED" },
        take: 5,
        orderBy: { startedAt: "desc" },
        select: { name: true, startedAt: true, durationSec: true },
      }),
      prisma.goal.findMany({
        where: { userId, completed: false },
        take: 10,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, onboardingCompletedAt: true },
      }),
      loadMuscleRecovery(userId).catch(() => null),
      loadHealthDashboard(userId).catch(() => null),
    ]);

  const metrics = profile ? profileToMetricsInput(profile) : null;
  const bmi =
    profile?.bmi ??
    (profile?.weightKg && profile.heightCm
      ? calculateBMI(profile.weightKg, profile.heightCm)
      : null);

  const lines: string[] = [
    `Name: ${user?.name ?? "—"}`,
    `Onboarding abgeschlossen: ${user?.onboardingCompletedAt ? "ja" : "nein"}`,
  ];

  if (profile) {
    lines.push(
      `Alter: ${profile.age ?? "—"} · Geschlecht: ${profile.gender ?? "—"}`,
      `Größe: ${profile.heightCm ?? "—"} cm · Gewicht: ${profile.weightKg ?? "—"} kg · BMI: ${bmi ?? "—"}`,
      `Aktivität: ${profile.activityLevel ? ACTIVITY_LABELS[profile.activityLevel] : "—"}`,
      `Hauptziel Training: ${profile.trainingGoal ? TRAINING_GOAL_LABELS[profile.trainingGoal] : "—"}`,
      `Ernährungsziel: ${profile.nutritionGoal ? NUTRITION_GOAL_LABELS[profile.nutritionGoal] : "—"}`,
      `Erfahrung: ${profile.experienceLevel ? EXPERIENCE_LABELS[profile.experienceLevel] : "—"}`,
      `Trainingstage/Woche: ${profile.workoutDaysPerWeek ?? "—"}`,
      `Kalorienziel: ${profile.calorieTarget ?? "—"} kcal`,
      `Makroziele: P ${profile.proteinTargetG ?? "—"}g · KH ${profile.carbsTargetG ?? "—"}g · F ${profile.fatTargetG ?? "—"}g`
    );
  }

  if (nutrition) {
    lines.push(
      `Heute verzehrt: ${Math.round(nutrition.consumed.calories)} kcal, P ${Math.round(nutrition.consumed.proteinG)}g, KH ${Math.round(nutrition.consumed.carbsG)}g, F ${Math.round(nutrition.consumed.fatG)}g`,
      `Heute übrig: ${Math.round(nutrition.remaining.calories)} kcal`,
      `Wasser heute: ${nutrition.water.consumedMl}/${nutrition.water.targetMl} ml`
    );
  }

  if (training) {
    const streak =
      training.trainingStreak?.currentDays ?? training.streak?.currentDays ?? 0;
    lines.push(
      `Trainings-Streak: ${streak} Tage`,
      `Letztes Training: ${recentSessions[0]?.name ?? "—"}`,
      `Nächster Plan: ${training.nextWorkout?.planName ?? "—"}`
    );
  }

  if (activityWeek) {
    lines.push(
      `Aktivitäten diese Woche: ${activityWeek.count} · ${Math.round(activityWeek.totalDistanceM / 1000)} km`
    );
  }

  if (health) {
    lines.push(
      `Schritte heute: ${health.today.steps}/${health.goals.dailyStepGoal}`,
      `Aktive Minuten: ${health.today.activeMinutes}`,
      `Kalorienverbrauch heute: ${health.today.caloriesBurned} kcal`
    );
  }

  if (recovery) {
    lines.push(
      `Regeneration: ${recovery.highlights.map((h) => `${h.label} ${h.recoveryPercent}%`).join(", ")}`
    );
  }

  if (profile?.targetWeightKg) {
    lines.push(
      `Zielgewicht: ${profile.weightKg ?? "—"} kg → ${profile.targetWeightKg} kg bis ${profile.targetWeightDate?.toISOString().slice(0, 10) ?? "—"}`
    );
  }

  if (recentSessions.length) {
    lines.push(
      `Letzte Sessions: ${recentSessions.map((s) => `${s.name} (${s.startedAt.toISOString().slice(0, 10)})`).join("; ")}`
    );
  }

  if (goals.length) {
    lines.push(`Aktive Ziele: ${goals.map((g) => g.title).join(", ")}`);
  }

  if (metrics) {
    lines.push(`BMR geschätzt: ${Math.round(10 * metrics.weightKg + 6.25 * metrics.heightCm - 5 * metrics.age)} (Richtwert)`);
  }

  return lines.join("\n");
}
