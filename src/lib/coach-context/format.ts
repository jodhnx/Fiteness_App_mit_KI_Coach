import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";
import type { AdaptiveRecommendations } from "@/lib/intelligence/recommendations/types";
import type { CoachContextMode } from "@/lib/coach-actions";

export function formatDailyIntelForCoach(
  intel: DailyFitnessIntelligence,
  mode: CoachContextMode
): string[] {
  const lines: string[] = [];
  if (intel.primary) {
    lines.push(`Priorität heute: ${intel.primary.description}`);
  }
  if (mode === "general") {
    if (intel.nutrition.proteinRemaining != null && intel.nutrition.proteinTarget) {
      lines.push(
        `Protein: ${intel.nutrition.proteinConsumed ?? 0}/${intel.nutrition.proteinTarget} g (offen: ${intel.nutrition.proteinRemaining} g)`
      );
    }
    if (intel.training.label) {
      lines.push(`Training: ${intel.training.label}`);
    }
    return lines;
  }
  lines.push(
    `Protein übrig: ${intel.nutrition.proteinRemaining ?? "keine Daten"} g`,
    `Kalorien übrig: ${intel.nutrition.caloriesRemaining ?? "keine Daten"} kcal`,
    `Training heute: ${intel.training.doneToday ? "erledigt/aktiv" : intel.training.plannedToday ? "geplant" : "offen"}`,
    `Gewicht-Trend: ${intel.weight.trendLabel}${intel.weight.plateauDetected ? " (Plateau)" : ""}`
  );
  if (intel.recovery.sleepHours != null) {
    lines.push(`Schlaf: ${intel.recovery.sleepHours.toFixed(1)} h`);
  }
  return lines;
}

export function formatWeeklyIntelCompact(
  intel: WeeklyFitnessIntelligence,
  mode: CoachContextMode
): string[] {
  if (mode === "weekly") {
    return [
      `Summary: ${intel.coachContext.weeklySummary}`,
      `Training: ${intel.training.completed}${intel.training.planned != null ? `/${intel.training.planned}` : ""} (${intel.training.status})`,
      `Ernährung: Protein ${intel.nutrition.proteinDaysOnTarget}/${intel.nutrition.proteinDaysTotal} Tage (${intel.nutrition.status})`,
      `Gewicht: ${intel.weight.changeKg != null ? `${intel.weight.changeKg} kg` : "keine Daten"} (${intel.weight.status})`,
      `Progress: ${intel.progress.status}`,
      `Recovery: ${intel.recovery.status}`,
      ...(intel.coachContext.weeklyPriorities.length
        ? [`Prioritäten: ${intel.coachContext.weeklyPriorities.join(" | ")}`]
        : []),
      ...(intel.coachContext.weeklyAchievements.length
        ? [`Erfolge: ${intel.coachContext.weeklyAchievements.slice(0, 3).join("; ")}`]
        : []),
    ];
  }
  if (mode === "weight") {
    return [
      `Woche: ${intel.coachContext.weeklySummary}`,
      `Gewicht: ${intel.weight.changeKg != null ? `${intel.weight.changeKg} kg` : "keine Daten"} (${intel.weight.status})`,
      `Kalorien Δ vs Ziel: ${intel.nutrition.calorieDeltaVsTarget ?? "keine Daten"} kcal`,
      `Training: ${intel.training.completed}${intel.training.planned != null ? `/${intel.training.planned}` : ""} (${intel.training.status})`,
    ];
  }
  return [
    `Woche: ${intel.coachContext.weeklySummary}`,
    `Training ${intel.training.completed}${intel.training.planned != null ? `/${intel.training.planned}` : ""}`,
    `Protein ${intel.nutrition.proteinDaysOnTarget}/${intel.nutrition.proteinDaysTotal} Tage`,
  ];
}

export function formatAdaptiveForCoach(
  adaptive: AdaptiveRecommendations,
  mode: CoachContextMode
): string[] {
  const lines = [`Summary: ${adaptive.coachContext.summary}`];
  for (const item of adaptive.coachContext.items.slice(0, mode === "general" ? 1 : 3)) {
    const caution =
      item.confidence === "low"
        ? " [vorsichtig formulieren — begrenzte Daten]"
        : item.confidence === "high"
          ? " [konkret formulieren erlaubt]"
          : " [moderate Sicherheit — nicht überdramatisieren]";
    const confirm = item.requiresConfirmation
      ? " [Nur vorschlagen — Nutzer muss bestätigen]"
      : "";
    lines.push(`- ${item.explanation}${caution}${confirm}`);
    if (item.evidence.length) {
      lines.push(`  Evidenz: ${item.evidence.slice(0, 2).join(" | ")}`);
    }
  }
  return lines;
}

export function dayPartLabel(): string {
  const h = new Date().getHours();
  if (h < 11) return "Vormittag";
  if (h < 14) return "Mittag";
  if (h < 18) return "Nachmittag";
  return "Abend";
}
