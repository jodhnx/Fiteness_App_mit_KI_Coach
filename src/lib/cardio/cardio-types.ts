/**
 * Cardio catalog — maps UI activities to EnduranceActivityType + MET for estimates.
 * No invented wearable measurements; MET estimates only when no measured kcal.
 */

import type { EnduranceActivityType } from "@prisma/client";

export type CardioIntensity = "LOW" | "MODERATE" | "HIGH";

export type CardioCatalogItem = {
  id: string;
  label: string;
  emoji: string;
  /** Prisma endurance type */
  type: EnduranceActivityType;
  /** Optional display override stored in notes prefix */
  customLabel?: string;
  /** MET at moderate intensity (Compendium of Physical Activities range) */
  metModerate: number;
  metLow: number;
  metHigh: number;
};

export const CARDIO_CATALOG: CardioCatalogItem[] = [
  { id: "walking", label: "Gehen", emoji: "🚶", type: "WALKING", metModerate: 3.5, metLow: 2.5, metHigh: 4.5 },
  { id: "running", label: "Laufen", emoji: "🏃", type: "RUNNING", metModerate: 9.8, metLow: 7.0, metHigh: 12.0 },
  { id: "jogging", label: "Joggen", emoji: "🏃", type: "JOGGING", metModerate: 7.0, metLow: 5.5, metHigh: 8.5 },
  { id: "cycling", label: "Radfahren", emoji: "🚴", type: "CYCLING", metModerate: 7.5, metLow: 4.0, metHigh: 10.0 },
  { id: "indoor_cycling", label: "Indoor Cycling", emoji: "🚴", type: "CYCLING", customLabel: "Indoor Cycling", metModerate: 8.0, metLow: 5.5, metHigh: 11.0 },
  { id: "swimming", label: "Schwimmen", emoji: "🏊", type: "SWIMMING", metModerate: 8.0, metLow: 5.0, metHigh: 10.0 },
  { id: "rowing", label: "Rudern", emoji: "🚣", type: "ROWING", metModerate: 7.0, metLow: 4.8, metHigh: 10.0 },
  { id: "stairmaster", label: "Stairmaster", emoji: "🧗", type: "OTHER", customLabel: "Stairmaster", metModerate: 9.0, metLow: 6.0, metHigh: 12.0 },
  { id: "hiking", label: "Wandern", emoji: "🏔️", type: "HIKING", metModerate: 6.0, metLow: 4.5, metHigh: 8.0 },
  { id: "hiit", label: "HIIT", emoji: "⚡", type: "OTHER", customLabel: "HIIT", metModerate: 10.0, metLow: 7.0, metHigh: 12.5 },
  { id: "boxing", label: "Boxen", emoji: "🥊", type: "OTHER", customLabel: "Boxen", metModerate: 8.5, metLow: 5.5, metHigh: 11.0 },
  { id: "treadmill_run", label: "Laufband", emoji: "🏃", type: "RUNNING", customLabel: "Laufband", metModerate: 9.0, metLow: 6.5, metHigh: 11.5 },
  { id: "treadmill_walk", label: "Laufband Gehen", emoji: "🚶", type: "WALKING", customLabel: "Laufband Gehen", metModerate: 3.8, metLow: 2.8, metHigh: 5.0 },
  { id: "ergometer", label: "Ergometer", emoji: "🚴", type: "CYCLING", customLabel: "Ergometer", metModerate: 7.0, metLow: 4.5, metHigh: 9.5 },
  { id: "elliptical", label: "Crosstrainer", emoji: "🛶", type: "OTHER", customLabel: "Crosstrainer", metModerate: 6.5, metLow: 4.5, metHigh: 9.0 },
  { id: "stepper", label: "Stepper", emoji: "🪜", type: "OTHER", customLabel: "Stepper", metModerate: 6.0, metLow: 4.0, metHigh: 8.5 },
  { id: "jump_rope", label: "Seilspringen", emoji: "🪢", type: "OTHER", customLabel: "Seilspringen", metModerate: 11.0, metLow: 8.0, metHigh: 12.5 },
  { id: "custom", label: "Benutzerdefiniertes Cardio", emoji: "✨", type: "OTHER", customLabel: "Benutzerdefiniert", metModerate: 6.0, metLow: 4.0, metHigh: 9.0 },
];

export function getCardioById(id: string): CardioCatalogItem | undefined {
  return CARDIO_CATALOG.find((c) => c.id === id);
}

export function metForIntensity(
  item: CardioCatalogItem,
  intensity: CardioIntensity
): number {
  if (intensity === "LOW") return item.metLow;
  if (intensity === "HIGH") return item.metHigh;
  return item.metModerate;
}

export function cardioDisplayLabel(
  type: EnduranceActivityType,
  notes?: string | null
): string {
  const fromNotes = notes?.match(/^\[cardio:([^\]]+)\]/)?.[1];
  if (fromNotes) return fromNotes;
  const map: Record<EnduranceActivityType, string> = {
    RUNNING: "Laufen",
    JOGGING: "Joggen",
    CYCLING: "Radfahren",
    HIKING: "Wandern",
    WALKING: "Gehen",
    SWIMMING: "Schwimmen",
    ROWING: "Rudern",
    OTHER: "Cardio",
  };
  return map[type] ?? "Cardio";
}

export function cardioEmoji(type: EnduranceActivityType, notes?: string | null): string {
  const label = cardioDisplayLabel(type, notes).toLowerCase();
  const hit = CARDIO_CATALOG.find(
    (c) =>
      c.label.toLowerCase() === label ||
      (c.customLabel && c.customLabel.toLowerCase() === label)
  );
  if (hit) return hit.emoji;
  const map: Partial<Record<EnduranceActivityType, string>> = {
    RUNNING: "🏃",
    JOGGING: "🏃",
    CYCLING: "🚴",
    HIKING: "🏔️",
    WALKING: "🚶",
    SWIMMING: "🏊",
    ROWING: "🚣",
  };
  return map[type] ?? "🔥";
}

export function buildCardioNotes(
  item: CardioCatalogItem,
  intensity: CardioIntensity,
  extra?: string
): string {
  const label = item.customLabel ?? item.label;
  const base = `[cardio:${label}][intensity:${intensity}][estimated:1]`;
  return extra?.trim() ? `${base} ${extra.trim()}` : base;
}

export function isEstimatedCardio(notes?: string | null): boolean {
  return Boolean(notes?.includes("[estimated:1]"));
}
