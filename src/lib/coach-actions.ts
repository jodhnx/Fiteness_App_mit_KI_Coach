/**
 * Real in-app actions the Coach may suggest.
 * Only routes/features that already exist — no fake buttons.
 */

export type CoachAction = {
  id: string;
  label: string;
  href: string;
};

export type CoachContextMode =
  | "nutrition"
  | "training"
  | "weekly"
  | "weight"
  | "plan"
  | "general";

const ACTIONS: Record<string, CoachAction> = {
  findMeal: {
    id: "findMeal",
    label: "Protein-Mahlzeit finden",
    href: "/nutrition?add=LUNCH",
  },
  openNutrition: {
    id: "openNutrition",
    label: "Ernährung öffnen",
    href: "/nutrition",
  },
  startWorkout: {
    id: "startWorkout",
    label: "Training starten",
    href: "/workouts",
  },
  quickWorkout: {
    id: "quickWorkout",
    label: "Schnelltraining",
    href: "/workouts/quick",
  },
  openPlans: {
    id: "openPlans",
    label: "Trainingspläne",
    href: "/workouts/my-plans",
  },
  aiPlanGenerator: {
    id: "aiPlanGenerator",
    label: "Plan-Generator",
    href: "/workouts/generator",
  },
  analyzeWeight: {
    id: "analyzeWeight",
    label: "Gewicht analysieren",
    href: "/progress",
  },
  logWeight: {
    id: "logWeight",
    label: "Gewicht eintragen",
    href: "/progress?log=1",
  },
  openProgress: {
    id: "openProgress",
    label: "Tagesziel ansehen",
    href: "/progress",
  },
  openRecords: {
    id: "openRecords",
    label: "Rekorde ansehen",
    href: "/workouts/records",
  },
};

export function actionsForContextMode(mode: CoachContextMode): CoachAction[] {
  switch (mode) {
    case "nutrition":
      return [ACTIONS.findMeal, ACTIONS.openNutrition];
    case "training":
      return [ACTIONS.startWorkout, ACTIONS.quickWorkout];
    case "weekly":
      return [ACTIONS.openProgress, ACTIONS.openNutrition, ACTIONS.startWorkout];
    case "weight":
      return [ACTIONS.analyzeWeight, ACTIONS.logWeight, ACTIONS.openNutrition];
    case "plan":
      return [ACTIONS.aiPlanGenerator, ACTIONS.openPlans];
    default:
      return [ACTIONS.openNutrition, ACTIONS.startWorkout, ACTIONS.openProgress];
  }
}

export function detectCoachContextMode(
  message: string,
  hint?: CoachContextMode | null
): CoachContextMode {
  if (hint && hint !== "general") return hint;

  const t = message.toLowerCase();

  if (
    /stagnier|gewicht|abnehm|zunehm|waage|körpergewicht|cut|bulk|kaloriedefizit/.test(
      t
    )
  ) {
    return "weight";
  }
  if (
    /trainingsplan|wochenplan|split|übungen planen|plan erstellen|plan optimier|generator/.test(
      t
    )
  ) {
    return "plan";
  }
  if (
    /woche|wochenüberblick|wochenbericht|wie läuft|fortschritt diese woche|zusammenfassung/.test(
      t
    )
  ) {
    return "weekly";
  }
  if (
    /essen|ernähr|protein|kcal|kalorien|mahlzeit|makro|hunger|snack|trinken|wasser|kohlenhydrat|fett\b/.test(
      t
    )
  ) {
    return "nutrition";
  }
  if (
    /trainier|workout|übung|satz|wiederholung|muskel|kraft|cardio|regeneration|deload|heute train/.test(
      t
    )
  ) {
    return "training";
  }

  return "general";
}
