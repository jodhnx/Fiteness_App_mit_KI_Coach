/** Home widget layout — persisted in localStorage, additive over existing sections. */

export type HomeWidgetId =
  | "quickAccess"
  | "dashboard"
  | "coachBriefing"
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

const STORAGE_KEY = "nexform:home-widgets-v3";

export const DEFAULT_HOME_WIDGETS: HomeWidgetConfig[] = [
  { id: "dashboard", label: "Tagesstatus", visible: true },
  { id: "quickAccess", label: "Schnellzugriffe", visible: true },
  { id: "training", label: "Training heute", visible: true },
  { id: "coachBriefing", label: "KI Coach Briefing", visible: false },
  { id: "dayGoals", label: "Tagesziele", visible: false },
  { id: "progress", label: "Fortschritt", visible: false },
  { id: "health", label: "Gesundheit", visible: false },
  { id: "dayFocus", label: "Fokus", visible: false },
  { id: "daySummary", label: "Tageszusammenfassung", visible: false },
  { id: "achievements", label: "Erfolge", visible: false },
];

export function loadHomeWidgets(): HomeWidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_HOME_WIDGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_WIDGETS;
    const parsed = JSON.parse(raw) as HomeWidgetConfig[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_HOME_WIDGETS;
    // Merge new widgets that appeared after user saved older layout
    const ids = new Set(parsed.map((w) => w.id));
    const merged = [...parsed];
    for (const d of DEFAULT_HOME_WIDGETS) {
      if (!ids.has(d.id)) merged.push(d);
    }
    return merged;
  } catch {
    return DEFAULT_HOME_WIDGETS;
  }
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
