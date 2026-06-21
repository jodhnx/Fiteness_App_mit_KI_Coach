import type { HomeDataPayload } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { isSameDay } from "date-fns";
import type { MuscleRecovery } from "@/lib/recovery-shared";

export type HomeHighlight = "calories" | "training" | "streak" | null;

export type DayFocusItem = {
  id: string;
  message: string;
  priority: "high" | "medium" | "low";
};

export function computeHomeHighlight(
  home: HomeDataPayload,
  nutrition: NutritionDashboardPayload,
  activeSessionId: string | null
): HomeHighlight {
  const target = nutrition.targets.calories;
  const consumed = nutrition.consumed.calories;
  const hour = new Date().getHours();

  if (activeSessionId) return "training";

  const completedToday =
    home.lastCompletedWorkout?.completedAt &&
    isSameDay(new Date(home.lastCompletedWorkout.completedAt), new Date());

  const streakDays = home.trainingStreak?.currentDays ?? home.streak?.currentDays ?? 0;
  if (streakDays >= 2 && !completedToday && hour >= 17) return "streak";

  if (target > 0 && consumed / target >= 0.88 && consumed < target * 1.05) {
    return "calories";
  }

  if (home.nextWorkout?.dayId && !completedToday) return "training";

  return null;
}

export function buildDayFocusItems(
  home: HomeDataPayload,
  recoveryMuscles: MuscleRecovery[]
): DayFocusItem[] {
  const items: DayFocusItem[] = [];
  const seen = new Set<string>();

  for (const tip of home.coach.tips.slice(0, 4)) {
    if (seen.has(tip.message)) continue;
    seen.add(tip.message);
    items.push({
      id: `coach-${tip.type}`,
      message: tip.message,
      priority: tip.priority === "high" ? "high" : tip.priority === "medium" ? "medium" : "low",
    });
  }

  const legs = recoveryMuscles.find((m) => m.muscle === "LEGS");
  if (legs && legs.recoveryPercent >= 95 && !seen.has("legs")) {
    items.push({
      id: "recovery-legs",
      message: "Beine vollständig regeneriert — ideal für Beintraining.",
      priority: "medium",
    });
  }

  if (home.weightKg == null && items.length < 4) {
    items.push({
      id: "weight-log",
      message: "Neues Gewicht eintragen — Fortschritt sichtbar machen.",
      priority: "medium",
    });
  }

  const streakDays = home.trainingStreak?.currentDays ?? 0;
  const completedToday =
    home.lastCompletedWorkout?.completedAt &&
    isSameDay(new Date(home.lastCompletedWorkout.completedAt), new Date());
  if (streakDays > 0 && !completedToday && items.length < 5) {
    items.push({
      id: "streak",
      message: `Trainingsstreak ${streakDays} Tage — heute fortsetzen!`,
      priority: "high",
    });
  }

  return items.slice(0, 4);
}

export function muscleGroupsForWorkout(
  dayName: string,
  recoveryMuscles: MuscleRecovery[]
): string[] {
  const ready = recoveryMuscles
    .filter((m) => m.recoveryPercent >= 85)
    .map((m) => m.label);
  if (ready.length >= 2) return ready.slice(0, 4);

  const lower = dayName.toLowerCase();
  if (lower.includes("push")) return ["Brust", "Schultern", "Trizeps"];
  if (lower.includes("pull")) return ["Rücken", "Bizeps"];
  if (lower.includes("bein") || lower.includes("leg")) return ["Beine", "Gesäß"];
  if (lower.includes("oberkörper") || lower.includes("upper")) return ["Brust", "Rücken", "Schultern"];
  if (lower.includes("ganzkörper") || lower.includes("full")) return ["Ganzkörper"];
  return ready.length > 0 ? ready : [dayName];
}
