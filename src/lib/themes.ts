export type AppThemeId =
  | "clean-light"
  | "pure-white"
  | "soft-blue"
  | "ocean"
  | "graphite"
  | "dark"
  | "midnight"
  | "forest"
  | "purple"
  | "rose"
  | "sand"
  | "high-contrast"
  // Legacy accent-only ids (still valid in DB / localStorage)
  | "turquoise"
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "yellow"
  | "gold"
  | "pink"
  | "white"
  | "gray";

export type ColorMode = "dark" | "light";

export type UiDensity = "compact" | "standard" | "large";

export type ThemePreview = {
  id: AppThemeId;
  label: string;
  /** Swatch gradient / solid for settings tiles */
  preview: string;
  previewSecondary?: string;
  colorMode: ColorMode;
};

/** Professional appearance packs shown in Settings → Design. */
export const APP_THEMES: ThemePreview[] = [
  {
    id: "clean-light",
    label: "Clean Light",
    preview: "#3b82f6",
    previewSecondary: "#f4f7fa",
    colorMode: "light",
  },
  {
    id: "pure-white",
    label: "Pure White",
    preview: "#0f172a",
    previewSecondary: "#ffffff",
    colorMode: "light",
  },
  {
    id: "soft-blue",
    label: "Soft Blue",
    preview: "#60a5fa",
    previewSecondary: "#eff6ff",
    colorMode: "light",
  },
  {
    id: "ocean",
    label: "Ocean",
    preview: "#0284c7",
    previewSecondary: "#e0f2fe",
    colorMode: "light",
  },
  {
    id: "graphite",
    label: "Graphite",
    preview: "#64748b",
    previewSecondary: "#f1f5f9",
    colorMode: "light",
  },
  {
    id: "sand",
    label: "Sand",
    preview: "#d97706",
    previewSecondary: "#faf6f1",
    colorMode: "light",
  },
  {
    id: "forest",
    label: "Forest",
    preview: "#059669",
    previewSecondary: "#ecfdf5",
    colorMode: "light",
  },
  {
    id: "rose",
    label: "Rose",
    preview: "#e11d48",
    previewSecondary: "#fff1f2",
    colorMode: "light",
  },
  {
    id: "purple",
    label: "Purple",
    preview: "#7c3aed",
    previewSecondary: "#f5f3ff",
    colorMode: "light",
  },
  {
    id: "dark",
    label: "Dark",
    preview: "#3b82f6",
    previewSecondary: "#09090b",
    colorMode: "dark",
  },
  {
    id: "midnight",
    label: "Midnight",
    preview: "#818cf8",
    previewSecondary: "#020617",
    colorMode: "dark",
  },
  {
    id: "high-contrast",
    label: "High Contrast",
    preview: "#000000",
    previewSecondary: "#ffffff",
    colorMode: "light",
  },
];

/** Legacy accent themes still accepted from older installs. */
export const LEGACY_THEME_IDS: AppThemeId[] = [
  "turquoise",
  "blue",
  "green",
  "red",
  "orange",
  "yellow",
  "gold",
  "pink",
  "white",
  "gray",
  "purple",
];

export const COLOR_MODE_OPTIONS: { id: ColorMode; label: string }[] = [
  { id: "light", label: "Hell" },
  { id: "dark", label: "Dunkel" },
];

export const UI_DENSITY_OPTIONS: { id: UiDensity; label: string; hint: string }[] = [
  { id: "compact", label: "Kompakte Ansicht", hint: "Mehr Inhalt, weniger Abstand" },
  { id: "standard", label: "Standard", hint: "Ausgewogene Darstellung" },
  { id: "large", label: "Große Karten", hint: "Größere Touch-Flächen & Zahlen" },
];

export const DEFAULT_THEME: AppThemeId = "clean-light";
export const DEFAULT_DENSITY: UiDensity = "standard";
export const DEFAULT_COLOR_MODE: ColorMode = "light";

const STORAGE_THEME = "app-theme";
const STORAGE_DENSITY = "app-density";
const STORAGE_COLOR_MODE = "app-color-mode";

const LEGACY_TO_PACK: Partial<Record<AppThemeId, AppThemeId>> = {
  turquoise: "ocean",
  blue: "clean-light",
  green: "forest",
  red: "rose",
  orange: "sand",
  yellow: "sand",
  gold: "sand",
  pink: "rose",
  white: "pure-white",
  gray: "graphite",
};

export function isValidThemeId(id: string): id is AppThemeId {
  return (
    APP_THEMES.some((t) => t.id === id) ||
    LEGACY_THEME_IDS.includes(id as AppThemeId)
  );
}

export function normalizeThemeId(id: string | null | undefined): AppThemeId {
  if (!id) return DEFAULT_THEME;
  if (APP_THEMES.some((t) => t.id === id)) return id as AppThemeId;
  const mapped = LEGACY_TO_PACK[id as AppThemeId];
  if (mapped) return mapped;
  if (LEGACY_THEME_IDS.includes(id as AppThemeId)) return id as AppThemeId;
  return DEFAULT_THEME;
}

export function themeDefaultColorMode(theme: AppThemeId): ColorMode {
  const pack = APP_THEMES.find((t) => t.id === theme);
  if (pack) return pack.colorMode;
  return DEFAULT_COLOR_MODE;
}

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
  try {
    const rawTheme = localStorage.getItem(STORAGE_THEME);
    const theme = normalizeThemeId(rawTheme);
    const density =
      (localStorage.getItem(STORAGE_DENSITY) as UiDensity) || DEFAULT_DENSITY;
    const storedMode = localStorage.getItem(STORAGE_COLOR_MODE) as ColorMode | null;
    const pack = APP_THEMES.find((t) => t.id === theme);
    const colorMode =
      storedMode === "light" || storedMode === "dark"
        ? storedMode
        : pack?.colorMode ?? DEFAULT_COLOR_MODE;
    return {
      theme,
      density: UI_DENSITY_OPTIONS.some((d) => d.id === density)
        ? density
        : DEFAULT_DENSITY,
      colorMode,
    };
  } catch {
    return {
      theme: DEFAULT_THEME,
      density: DEFAULT_DENSITY,
      colorMode: DEFAULT_COLOR_MODE,
    };
  }
}

export function applyThemeToDocument(
  theme: AppThemeId,
  density: UiDensity,
  colorMode: ColorMode = DEFAULT_COLOR_MODE
) {
  if (typeof document === "undefined") return;
  try {
    const normalized = normalizeThemeId(theme);
    document.documentElement.dataset.theme = normalized;
    document.documentElement.dataset.appearance = normalized;
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.colorMode = colorMode;
    document.documentElement.classList.toggle("light", colorMode === "light");
    document.documentElement.classList.toggle("dark", colorMode !== "light");
    localStorage.setItem(STORAGE_THEME, normalized);
    localStorage.setItem(STORAGE_DENSITY, density);
    localStorage.setItem(STORAGE_COLOR_MODE, colorMode);
  } catch {
    /* private mode / storage blocked */
  }
}
