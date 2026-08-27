/** Home widget layout — persisted in localStorage, additive over existing sections. */

export type HomeWidgetId =
  | "quickAccess"
  | "dashboard"
  | "todayOverview"
  | "coachBriefing"
  | "todayGlance"
  | "dayGoals"
  | "health"
  | "training"
  | "dayFocus"
  | "progress"
  | "daySummary"
  | "achievements";

export type HomeWidgetConfig = {
  id: HomeWidgetId;
  label: string;
  visible: boolean;
};

/** Current storage key — new saves always use this. */
const STORAGE_KEY = "nexform:home-widgets-v8";

/** Older keys — read-only fallback for migration (never write back to these). */
const LEGACY_STORAGE_KEYS = [
  "nexform:home-widgets-v7",
  "nexform:home-widgets-v6",
  "nexform:home-widgets-v5",
  "nexform:home-widgets-v4",
] as const;

export const DEFAULT_HOME_WIDGETS: HomeWidgetConfig[] = [
  { id: "todayOverview", label: "Heute", visible: true },
  { id: "training", label: "Training heute", visible: true },
  { id: "coachBriefing", label: "Was heute wichtig ist", visible: true },
  { id: "todayGlance", label: "Heute auf einen Blick", visible: false },
  { id: "dashboard", label: "Tagesstatus", visible: false },
  { id: "quickAccess", label: "Schnellzugriffe", visible: false },
  { id: "dayGoals", label: "Tagesziele", visible: false },
  { id: "progress", label: "Fortschritt", visible: false },
  { id: "health", label: "Gesundheit", visible: false },
  { id: "dayFocus", label: "Fokus", visible: false },
  { id: "daySummary", label: "Tageszusammenfassung", visible: false },
  { id: "achievements", label: "Erfolge", visible: false },
];

function mergeWithDefaults(parsed: HomeWidgetConfig[]): HomeWidgetConfig[] {
  const byId = new Map(parsed.map((w) => [w.id, w]));
  const merged: HomeWidgetConfig[] = [];

  // Preserve user order first
  for (const w of parsed) {
    const def = DEFAULT_HOME_WIDGETS.find((d) => d.id === w.id);
    if (def) {
      merged.push({
        id: w.id,
        label: def.label,
        visible: w.visible,
      });
    }
  }

  // Append widgets the user never had (e.g. new ids) — keep saved visibility when present
  for (const def of DEFAULT_HOME_WIDGETS) {
    if (!byId.has(def.id)) {
      merged.push({ ...def });
    }
  }

  return merged;
}

function readStoredWidgets(): { widgets: HomeWidgetConfig[]; migrated: boolean } | null {
  if (typeof window === "undefined") return null;

  const tryParse = (raw: string | null): HomeWidgetConfig[] | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as HomeWidgetConfig[];
      if (!Array.isArray(parsed) || parsed.length === 0) return null;
      return mergeWithDefaults(parsed);
    } catch {
      return null;
    }
  };

  const current = tryParse(localStorage.getItem(STORAGE_KEY));
  if (current) return { widgets: current, migrated: false };

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacy = tryParse(localStorage.getItem(legacyKey));
    if (legacy) {
      return { widgets: legacy, migrated: true };
    }
  }

  return null;
}

export function loadHomeWidgets(): HomeWidgetConfig[] {
  const stored = readStoredWidgets();
  if (!stored) return DEFAULT_HOME_WIDGETS;

  if (stored.migrated) {
    saveHomeWidgets(stored.widgets);
  }

  return stored.widgets;
}

export function saveHomeWidgets(widgets: HomeWidgetConfig[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

export function moveWidget(
  widgets: HomeWidgetConfig[],
  id: HomeWidgetId,
  dir: -1 | 1
): HomeWidgetConfig[] {
  const i = widgets.findIndex((w) => w.id === id);
  if (i < 0) return widgets;
  const j = i + dir;
  if (j < 0 || j >= widgets.length) return widgets;
  const next = [...widgets];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
