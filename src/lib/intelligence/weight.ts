import { startOfDay, subDays } from "date-fns";
import type { IntelligenceContext } from "@/lib/intelligence/context";
import type {
  IntelligenceRecommendation,
  WeightIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";

const MIN_ENTRIES_FOR_TREND = 2;
const MIN_ENTRIES_FOR_PLATEAU = 5;
const PLATEAU_MIN_SPAN_DAYS = 10;
const PLATEAU_MAX_RANGE_KG = 0.35;
const PLATEAU_ABS_CHANGE_KG = 0.2;

function sortedEntries(ctx: IntelligenceContext) {
  return [...ctx.weightEntries]
    .filter((e) => e.weightKg != null && Number.isFinite(e.weightKg))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function changeOverDays(
  entries: { date: Date; weightKg: number }[],
  days: number,
  now: Date
): number | null {
  if (entries.length < MIN_ENTRIES_FOR_TREND) return null;
  const latest = entries[entries.length - 1]!;
  const cutoff = subDays(startOfDay(now), days);
  const past = entries.filter((e) => startOfDay(e.date) <= cutoff);
  const ref = past.length > 0 ? past[past.length - 1]! : entries[0]!;
  return Math.round((latest.weightKg - ref.weightKg) * 10) / 10;
}

function detectPlateau(
  entries: { date: Date; weightKg: number }[],
  now: Date
): boolean {
  if (entries.length < MIN_ENTRIES_FOR_PLATEAU) return false;
  const latest = entries[entries.length - 1]!;
  const windowStart = subDays(startOfDay(now), 14);
  const window = entries.filter((e) => startOfDay(e.date) >= windowStart);
  if (window.length < MIN_ENTRIES_FOR_PLATEAU) return false;

  const first = window[0]!;
  const spanDays =
    (startOfDay(latest.date).getTime() - startOfDay(first.date).getTime()) /
    (1000 * 60 * 60 * 24);
  if (spanDays < PLATEAU_MIN_SPAN_DAYS) return false;

  const weights = window.map((e) => e.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  if (max - min > PLATEAU_MAX_RANGE_KG) return false;

  const delta = latest.weightKg - first.weightKg;
  return Math.abs(delta) < PLATEAU_ABS_CHANGE_KG;
}

export function buildWeightSnapshot(
  ctx: IntelligenceContext
): WeightIntelligenceSnapshot {
  const entries = sortedEntries(ctx);
  const change7d = changeOverDays(entries, 7, ctx.now);
  const plateau = detectPlateau(entries, ctx.now);

  let trendLabel: WeightIntelligenceSnapshot["trendLabel"] = "insufficient_data";
  if (entries.length >= MIN_ENTRIES_FOR_TREND && change7d != null) {
    if (Math.abs(change7d) < 0.15) trendLabel = "stable";
    else if (change7d < 0) trendLabel = "down";
    else trendLabel = "up";
  }

  return {
    currentKg: ctx.weightKg,
    change7dKg: change7d,
    trendLabel,
    plateauDetected: plateau,
    targetKg: ctx.targetWeightKg,
  };
}

export function collectWeightRecommendations(
  ctx: IntelligenceContext,
  snapshot: WeightIntelligenceSnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (snapshot.trendLabel === "insufficient_data") {
    return recs;
  }

  if (snapshot.plateauDetected) {
    recs.push({
      id: "weight-plateau",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description:
        "Dein Gewicht bewegt sich seit längerem kaum — Kalorien, Protein und Training prüfen.",
      action: INTELLIGENCE_ACTIONS.progress,
    });
    return recs;
  }

  if (
    snapshot.change7dKg != null &&
    Math.abs(snapshot.change7dKg) >= 0.25 &&
    ctx.nutritionGoal === "FAT_LOSS" &&
    snapshot.change7dKg < 0
  ) {
    recs.push({
      id: "weight-trend-good",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description: `Dein Gewicht ist in 7 Tagen um ${Math.abs(snapshot.change7dKg).toFixed(1)} kg gesunken.`,
      values: { change7dKg: snapshot.change7dKg },
      action: INTELLIGENCE_ACTIONS.progress,
    });
  } else if (
    snapshot.change7dKg != null &&
    Math.abs(snapshot.change7dKg) >= 0.25 &&
    ctx.nutritionGoal === "MUSCLE_GAIN" &&
    snapshot.change7dKg > 0
  ) {
    recs.push({
      id: "weight-trend-bulk",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description: `+${snapshot.change7dKg.toFixed(1)} kg in 7 Tagen — passt zu deinem Aufbauziel.`,
      values: { change7dKg: snapshot.change7dKg },
      action: INTELLIGENCE_ACTIONS.progress,
    });
  } else if (
    snapshot.trendLabel === "stable" &&
    snapshot.change7dKg != null &&
    Math.abs(snapshot.change7dKg) < 0.2
  ) {
    recs.push({
      id: "weight-stable",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description: "Gewicht entwickelt sich stabil — weiter konstant tracken.",
      action: INTELLIGENCE_ACTIONS.progress,
    });
  }

  return recs;
}
