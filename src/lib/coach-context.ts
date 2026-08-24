import { prisma } from "@/lib/prisma";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { calculateBMI } from "@/lib/profile-calculations";
import {
  TRAINING_GOAL_LABELS,
  ACTIVITY_LABELS,
  EXPERIENCE_LABELS,
} from "@/lib/profile-calculations";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import { startOfDay } from "date-fns";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";

const PROFILE_COACH_SELECT = {
  age: true,
  weightKg: true,
  heightCm: true,
  gender: true,
  activityLevel: true,
  trainingGoal: true,
  nutritionGoal: true,
  experienceLevel: true,
  workoutDaysPerWeek: true,
  calorieTarget: true,
  proteinTargetG: true,
  carbsTargetG: true,
  fatTargetG: true,
  bmi: true,
  targetWeightKg: true,
  targetWeightDate: true,
} as const;

/**
 * Compact coach context — only fields the model needs for personalization.
 * Avoids full profile rows and duplicate health dashboards.
 */
export async function buildCoachUserContext(userId: string): Promise<string> {
  const today = startOfDay(new Date());
  const [profile, nutrition, training, recentSessions, goals, user, healthToday] =
    await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: PROFILE_COACH_SELECT,
      }),
      loadNutritionDashboard(userId, today).catch(() => null),
      loadTrainingSnapshot(userId).catch(() => null),
      prisma.workoutSession.findMany({
        where: { userId, status: "COMPLETED" },
        take: 3,
        orderBy: { startedAt: "desc" },
        select: { name: true, startedAt: true },
      }),
      prisma.goal.findMany({
        where: { userId, completed: false },
        take: 5,
        select: { title: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, onboardingCompletedAt: true },
      }),
      prisma.dailyHealthMetric
        .findFirst({
          where: { userId, date: today },
          select: {
            steps: true,
            sleepHours: true,
            restingHeartRate: true,
            recoveryScore: true,
            trainingReadiness: true,
          },
        })
        .catch(() => null),
    ]);

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

  if (healthToday) {
    lines.push(`Schritte heute: ${healthToday.steps}`);
    if (healthToday.sleepHours != null) {
      lines.push(`Schlaf letzte Nacht: ${healthToday.sleepHours.toFixed(1)} h`);
    }
    if (healthToday.restingHeartRate != null) {
      lines.push(`Ruhepuls: ${healthToday.restingHeartRate} bpm`);
    }
    if (healthToday.trainingReadiness != null) {
      lines.push(`Trainingsbereitschaft: ${healthToday.trainingReadiness}%`);
    }
    if (healthToday.recoveryScore != null) {
      lines.push(`Regeneration: ${healthToday.recoveryScore}%`);
    }
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

  if (
    profile?.weightKg &&
    profile.heightCm &&
    profile.age &&
    profile.gender &&
    profile.activityLevel
  ) {
    const bmr =
      profile.gender === "FEMALE"
        ? Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161)
        : Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5);
    const activityMult =
      profile.activityLevel === "VERY_ACTIVE"
        ? 1.725
        : profile.activityLevel === "ACTIVE"
          ? 1.55
          : profile.activityLevel === "MODERATE"
            ? 1.375
            : 1.2;
    lines.push(`BMR geschätzt (Mifflin-St Jeor): ${bmr} kcal`);
    lines.push(`TDEE-Richtwert: ${Math.round(bmr * activityMult)} kcal`);
  }

  lines.push(
    "Hinweis Coach: Bei Kalorien-/Makrofragen immer Profil + heutige Ernährung + Zielgewicht einbeziehen. Kurz und konkret antworten."
  );

  return lines.join("\n");
}
