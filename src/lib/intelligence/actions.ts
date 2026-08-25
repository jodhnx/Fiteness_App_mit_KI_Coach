import type { IntelligenceAction } from "@/lib/intelligence/types";

export const INTELLIGENCE_ACTIONS = {
  nutrition: { label: "Ernährung öffnen", href: "/nutrition" },
  findMeal: { label: "Mahlzeit hinzufügen", href: "/nutrition?add=LUNCH" },
  training: { label: "Training starten", href: "/workouts" },
  quickWorkout: { label: "Schnelltraining", href: "/workouts/quick" },
  progress: { label: "Fortschritt ansehen", href: "/progress" },
  records: { label: "Rekorde ansehen", href: "/workouts/records" },
  coach: { label: "Coach öffnen", href: "/coach" },
  savedMeals: { label: "Gespeicherte Mahlzeiten", href: "/nutrition" },
  editPlan: { label: "Plan bearbeiten", href: "/workouts/my-plans" },
  nutritionGoals: { label: "Ernährungsziele prüfen", href: "/settings" },
} as const satisfies Record<string, IntelligenceAction>;
