export type AppThemeId =
  | "turquoise"
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "yellow"
  | "gold"
  | "purple"
  | "pink"
  | "white"
  | "gray";

export type ColorMode = "dark" | "light";

export type UiDensity = "compact" | "standard" | "large";

export const APP_THEMES: {
  id: AppThemeId;
  label: string;
  preview: string;
}[] = [
  { id: "turquoise", label: "Türkis", preview: "#22d3ee" },
  { id: "blue", label: "Blau", preview: "#3b82f6" },
  { id: "green", label: "Grün", preview: "#22c55e" },
  { id: "red", label: "Rot", preview: "#ef4444" },
  { id: "orange", label: "Orange", preview: "#f97316" },
  { id: "yellow", label: "Gelb", preview: "#eab308" },
  { id: "gold", label: "Gold", preview: "#d4a017" },
  { id: "purple", label: "Lila", preview: "#a855f7" },
  { id: "pink", label: "Pink", preview: "#ec4899" },
  { id: "white", label: "Weiß", preview: "#f4f4f5" },
  { id: "gray", label: "Grau", preview: "#71717a" },
];

export const COLOR_MODE_OPTIONS: { id: ColorMode; label: string }[] = [
  { id: "dark", label: "Dark Mode" },
  { id: "light", label: "Light Mode" },
];

export const UI_DENSITY_OPTIONS: { id: UiDensity; label: string; hint: string }[] = [
  { id: "compact", label: "Kompakte Ansicht", hint: "Mehr Inhalt, weniger Abstand" },
  { id: "standard", label: "Standard", hint: "Ausgewogene Darstellung" },
  { id: "large", label: "Große Karten", hint: "Größere Touch-Flächen & Zahlen" },
];

export const DEFAULT_THEME: AppThemeId = "turquoise";
export const DEFAULT_DENSITY: UiDensity = "standard";
export const DEFAULT_COLOR_MODE: ColorMode = "dark";

const STORAGE_THEME = "app-theme";
const STORAGE_DENSITY = "app-density";
const STORAGE_COLOR_MODE = "app-color-mode";

export function readStoredPreferences(): {
  theme: AppThemeId;
  density: UiDensity;
  colorMode: ColorMode;
} {
  if (typeof window === "undefined") {
    return {
      theme: DEFAULT_THEME,
      density: DEFAULT_DENSITY,
      colorMode: DEFAULT_COLOR_MODE,
    };
  }
  const theme = (localStorage.getItem(STORAGE_THEME) as AppThemeId) || DEFAULT_THEME;
  const density = (localStorage.getItem(STORAGE_DENSITY) as UiDensity) || DEFAULT_DENSITY;
  const colorMode =
    (localStorage.getItem(STORAGE_COLOR_MODE) as ColorMode) || DEFAULT_COLOR_MODE;
  return {
    theme: APP_THEMES.some((t) => t.id === theme) ? theme : DEFAULT_THEME,
    density: UI_DENSITY_OPTIONS.some((d) => d.id === density) ? density : DEFAULT_DENSITY,
    colorMode: colorMode === "light" ? "light" : "dark",
  };
}

export function applyThemeToDocument(
  theme: AppThemeId,
  density: UiDensity,
  colorMode: ColorMode = DEFAULT_COLOR_MODE
) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.density = density;
  document.documentElement.dataset.colorMode = colorMode;
  document.documentElement.classList.toggle("light", colorMode === "light");
  document.documentElement.classList.toggle("dark", colorMode !== "light");
  localStorage.setItem(STORAGE_THEME, theme);
  localStorage.setItem(STORAGE_DENSITY, density);
  localStorage.setItem(STORAGE_COLOR_MODE, colorMode);
}
