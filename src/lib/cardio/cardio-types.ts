/**
 * Cardio catalog V2 — extensive AT/DE-friendly activity list with MET values.
 * Maps to EnduranceActivityType + customLabel for display.
 */

import type { EnduranceActivityType } from "@prisma/client";

export type CardioIntensity = "LOW" | "MODERATE" | "HIGH";

export type CardioCategory =
  | "running"
  | "walking"
  | "cycling"
  | "machines"
  | "water"
  | "sports"
  | "fitness"
  | "outdoor"
  | "custom";

export type CardioCatalogItem = {
  id: string;
  label: string;
  emoji: string;
  category: CardioCategory;
  type: EnduranceActivityType;
  customLabel?: string;
  metModerate: number;
  metLow: number;
  metHigh: number;
  keywords?: string[];
};

function item(
  partial: Omit<CardioCatalogItem, "metLow" | "metHigh"> & {
    metLow?: number;
    metHigh?: number;
  }
): CardioCatalogItem {
  const mid = partial.metModerate;
  return {
    ...partial,
    metLow: partial.metLow ?? Math.max(2, mid * 0.7),
    metHigh: partial.metHigh ?? mid * 1.25,
  };
}

export const CARDIO_CATEGORY_LABELS: Record<CardioCategory, string> = {
  running: "Laufen",
  walking: "Gehen",
  cycling: "Rad",
  machines: "Ausdauergeräte",
  water: "Wasser",
  sports: "Sport",
  fitness: "Fitness",
  outdoor: "Outdoor",
  custom: "Sonstige",
};

export const CARDIO_CATALOG: CardioCatalogItem[] = [
  // LAUFEN
  item({ id: "outdoor_running", label: "Outdoor Running", emoji: "🏃", category: "running", type: "RUNNING", customLabel: "Outdoor Running", metModerate: 9.8, keywords: ["laufen", "running", "jog"] }),
  item({ id: "treadmill_run", label: "Laufband", emoji: "🏃", category: "running", type: "RUNNING", customLabel: "Laufband", metModerate: 9.0, keywords: ["laufband", "treadmill"] }),
  item({ id: "interval_run", label: "Intervalllauf", emoji: "⚡", category: "running", type: "RUNNING", customLabel: "Intervalllauf", metModerate: 11.0, keywords: ["intervall", "interval"] }),
  item({ id: "sprint", label: "Sprint", emoji: "💨", category: "running", type: "RUNNING", customLabel: "Sprint", metModerate: 12.5, keywords: ["sprint"] }),
  item({ id: "jogging", label: "Jogging", emoji: "🏃", category: "running", type: "JOGGING", metModerate: 7.0, keywords: ["joggen", "jogging"] }),
  item({ id: "running", label: "Laufen", emoji: "🏃", category: "running", type: "RUNNING", metModerate: 9.8, keywords: ["laufen", "run"] }),

  // GEHEN
  item({ id: "walking", label: "Gehen", emoji: "🚶", category: "walking", type: "WALKING", metModerate: 3.5, keywords: ["gehen", "walk", "spaziergang"] }),
  item({ id: "brisk_walk", label: "Schnelles Gehen", emoji: "🚶", category: "walking", type: "WALKING", customLabel: "Schnelles Gehen", metModerate: 4.5, keywords: ["schnell", "powerwalk"] }),
  item({ id: "treadmill_walk", label: "Laufband Gehen", emoji: "🚶", category: "walking", type: "WALKING", customLabel: "Laufband Gehen", metModerate: 3.8, keywords: ["laufband"] }),
  item({ id: "hiking", label: "Wandern", emoji: "🏔️", category: "walking", type: "HIKING", metModerate: 6.0, keywords: ["wandern", "hike"] }),
  item({ id: "mountain_hike", label: "Bergwandern", emoji: "⛰️", category: "walking", type: "HIKING", customLabel: "Bergwandern", metModerate: 7.5, keywords: ["berg", "alpin"] }),

  // RAD
  item({ id: "cycling", label: "Fahrrad", emoji: "🚴", category: "cycling", type: "CYCLING", metModerate: 7.5, keywords: ["rad", "fahrrad", "bike"] }),
  item({ id: "road_bike", label: "Rennrad", emoji: "🚴", category: "cycling", type: "CYCLING", customLabel: "Rennrad", metModerate: 8.5, keywords: ["rennrad", "road"] }),
  item({ id: "mtb", label: "Mountainbike", emoji: "🚵", category: "cycling", type: "CYCLING", customLabel: "Mountainbike", metModerate: 8.5, keywords: ["mtb", "mountain"] }),
  item({ id: "indoor_cycling", label: "Indoor Cycling", emoji: "🚴", category: "cycling", type: "CYCLING", customLabel: "Indoor Cycling", metModerate: 8.0, keywords: ["indoor", "spin"] }),
  item({ id: "ergometer", label: "Ergometer", emoji: "🚴", category: "cycling", type: "CYCLING", customLabel: "Ergometer", metModerate: 7.0, keywords: ["ergo"] }),
  item({ id: "spinning", label: "Spinning", emoji: "🌀", category: "cycling", type: "CYCLING", customLabel: "Spinning", metModerate: 8.5, keywords: ["spinning"] }),

  // GERÄTE
  item({ id: "elliptical", label: "Crosstrainer", emoji: "🛶", category: "machines", type: "OTHER", customLabel: "Crosstrainer", metModerate: 6.5, keywords: ["cross", "ellipt"] }),
  item({ id: "elliptical_alt", label: "Ellipsentrainer", emoji: "⭕", category: "machines", type: "OTHER", customLabel: "Ellipsentrainer", metModerate: 6.5, keywords: ["ellipse"] }),
  item({ id: "stairmaster", label: "Stairmaster", emoji: "🧗", category: "machines", type: "OTHER", customLabel: "Stairmaster", metModerate: 9.0, keywords: ["stair", "treppe"] }),
  item({ id: "stepper", label: "Stepper", emoji: "🪜", category: "machines", type: "OTHER", customLabel: "Stepper", metModerate: 6.0, keywords: ["step"] }),
  item({ id: "rowing_machine", label: "Rudergerät", emoji: "🚣", category: "machines", type: "ROWING", customLabel: "Rudergerät", metModerate: 7.0, keywords: ["rudern", "row"] }),
  item({ id: "skierg", label: "SkiErg", emoji: "⛷️", category: "machines", type: "OTHER", customLabel: "SkiErg", metModerate: 8.5, keywords: ["ski", "erg"] }),
  item({ id: "assault_bike", label: "Assault Bike", emoji: "🔥", category: "machines", type: "OTHER", customLabel: "Assault Bike", metModerate: 10.5, keywords: ["assault", "airbike"] }),

  // WASSER
  item({ id: "swimming", label: "Schwimmen", emoji: "🏊", category: "water", type: "SWIMMING", metModerate: 8.0, keywords: ["schwimmen", "swim"] }),
  item({ id: "open_water", label: "Freiwasserschwimmen", emoji: "🌊", category: "water", type: "SWIMMING", customLabel: "Freiwasserschwimmen", metModerate: 8.5, keywords: ["frei", "open"] }),
  item({ id: "aqua_jog", label: "Aquajogging", emoji: "💦", category: "water", type: "OTHER", customLabel: "Aquajogging", metModerate: 5.5, keywords: ["aqua"] }),
  item({ id: "rowing", label: "Rudern", emoji: "🚣", category: "water", type: "ROWING", metModerate: 7.0, keywords: ["rudern"] }),
  item({ id: "kayak", label: "Kajak", emoji: "🛶", category: "water", type: "OTHER", customLabel: "Kajak", metModerate: 5.0, keywords: ["kajak", "kayak"] }),
  item({ id: "canoe", label: "Kanufahren", emoji: "🛶", category: "water", type: "OTHER", customLabel: "Kanufahren", metModerate: 5.0, keywords: ["kanu", "canoe"] }),

  // SPORT
  item({ id: "football", label: "Fußball", emoji: "⚽", category: "sports", type: "OTHER", customLabel: "Fußball", metModerate: 8.0, keywords: ["fussball", "fußball", "soccer"] }),
  item({ id: "basketball", label: "Basketball", emoji: "🏀", category: "sports", type: "OTHER", customLabel: "Basketball", metModerate: 8.0, keywords: ["basket"] }),
  item({ id: "tennis", label: "Tennis", emoji: "🎾", category: "sports", type: "OTHER", customLabel: "Tennis", metModerate: 7.5, keywords: ["tennis"] }),
  item({ id: "volleyball", label: "Volleyball", emoji: "🏐", category: "sports", type: "OTHER", customLabel: "Volleyball", metModerate: 6.0, keywords: ["volley"] }),
  item({ id: "badminton", label: "Badminton", emoji: "🏸", category: "sports", type: "OTHER", customLabel: "Badminton", metModerate: 5.5, keywords: ["badminton"] }),
  item({ id: "boxing", label: "Boxen", emoji: "🥊", category: "sports", type: "OTHER", customLabel: "Boxen", metModerate: 8.5, keywords: ["box"] }),
  item({ id: "kickboxing", label: "Kickboxen", emoji: "🦵", category: "sports", type: "OTHER", customLabel: "Kickboxen", metModerate: 9.0, keywords: ["kick"] }),
  item({ id: "mma", label: "MMA Training", emoji: "🥋", category: "sports", type: "OTHER", customLabel: "MMA Training", metModerate: 9.5, keywords: ["mma"] }),
  item({ id: "handball", label: "Handball", emoji: "🤾", category: "sports", type: "OTHER", customLabel: "Handball", metModerate: 8.0, keywords: ["handball"] }),
  item({ id: "hockey", label: "Hockey", emoji: "🏑", category: "sports", type: "OTHER", customLabel: "Hockey", metModerate: 8.0, keywords: ["hockey"] }),

  // FITNESS
  item({ id: "hiit", label: "HIIT", emoji: "⚡", category: "fitness", type: "OTHER", customLabel: "HIIT", metModerate: 10.0, keywords: ["hiit"] }),
  item({ id: "jump_rope", label: "Seilspringen", emoji: "🪢", category: "fitness", type: "OTHER", customLabel: "Seilspringen", metModerate: 11.0, keywords: ["seil", "jump", "rope"] }),
  item({ id: "aerobics", label: "Aerobic", emoji: "💃", category: "fitness", type: "OTHER", customLabel: "Aerobic", metModerate: 6.5, keywords: ["aerobic"] }),
  item({ id: "zumba", label: "Zumba", emoji: "🕺", category: "fitness", type: "OTHER", customLabel: "Zumba", metModerate: 6.5, keywords: ["zumba"] }),
  item({ id: "dance", label: "Dance Workout", emoji: "🎵", category: "fitness", type: "OTHER", customLabel: "Dance Workout", metModerate: 6.0, keywords: ["dance", "tanz"] }),
  item({ id: "circuit", label: "Circuit Training", emoji: "🔁", category: "fitness", type: "OTHER", customLabel: "Circuit Training", metModerate: 8.0, keywords: ["circuit", "zirkel"] }),

  // OUTDOOR
  item({ id: "climbing", label: "Klettern", emoji: "🧗", category: "outdoor", type: "OTHER", customLabel: "Klettern", metModerate: 7.0, keywords: ["klettern", "climb"] }),
  item({ id: "inline", label: "Inline Skating", emoji: "🛼", category: "outdoor", type: "OTHER", customLabel: "Inline Skating", metModerate: 7.0, keywords: ["inline", "skating"] }),
  item({ id: "rollerskate", label: "Rollschuhlaufen", emoji: "🛼", category: "outdoor", type: "OTHER", customLabel: "Rollschuhlaufen", metModerate: 6.0, keywords: ["rollschuh"] }),

  // CUSTOM
  item({ id: "custom", label: "Benutzerdefiniertes Cardio", emoji: "✨", category: "custom", type: "OTHER", customLabel: "Benutzerdefiniert", metModerate: 6.0, keywords: ["custom", "sonstig", "eigene"] }),
];

export function getCardioById(id: string): CardioCatalogItem | undefined {
  return CARDIO_CATALOG.find((c) => c.id === id);
}

export function searchCardioCatalog(query: string, limit = 40): CardioCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return CARDIO_CATALOG.slice(0, limit);
  const scored = CARDIO_CATALOG.map((c) => {
    const hay = [
      c.label,
      c.customLabel ?? "",
      c.category,
      ...(c.keywords ?? []),
    ]
      .join(" ")
      .toLowerCase();
    let score = 0;
    if (c.label.toLowerCase() === q) score += 100;
    if (c.label.toLowerCase().startsWith(q)) score += 50;
    if (hay.includes(q)) score += 30;
    for (const part of q.split(/\s+/)) {
      if (part.length >= 2 && hay.includes(part)) score += 10;
    }
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.c);
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
