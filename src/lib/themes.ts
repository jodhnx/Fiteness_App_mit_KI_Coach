export type AppThemeId =
  | "premium-dark"
  | "deep-dark"
  | "midnight"
  | "graphite"
  | "carbon"
  | "oled-black"
  | "dark"
  | "soft-light"
  | "clean-light"
  | "premium-light"
  | "arctic"
  | "minimal"
  | "pure-white"
  | "soft-blue"
  | "ocean"
  | "forest"
  | "purple"
  | "rose"
  | "sand"
  | "high-contrast"
  | "red"
  // Legacy accent-only ids (still valid in DB / localStorage)
  | "turquoise"
  | "blue"
  | "green"
  | "orange"
  | "yellow"
  | "gold"
  | "pink"
  | "white"
  | "gray"
  | "system";

export type AccentId =
  | "violet"
  | "blue"
  | "cyan"
  | "sky"
  | "green"
  | "emerald"
  | "lime"
  | "orange"
  | "amber"
  | "red"
  | "rose"
  | "pink"
  | "magenta"
  | "purple"
  | "indigo"
  | "teal";

export type ColorMode = "dark" | "light";
export type UiDensity = "compact" | "standard" | "large";

/** Alias for appearance pack id. */
export type ThemeId = AppThemeId;
export type AppearanceId = AppThemeId;

export type ThemePreview = {
  id: AppThemeId;
  label: string;
  description?: string;
  /** Swatch accent for settings tiles */
  preview: string;
  previewSecondary?: string;
  colorMode: ColorMode;
  /** Featured in Design → Grundstil (primary list). */
  featured?: boolean;
};

export type AccentOption = {
  id: AccentId;
  label: string;
  hex: string;
};

export type DesignCombo = {
  id: string;
  label: string;
  appearance: AppThemeId;
  accent: AccentId;
};

/** Professional appearance packs shown in Settings → Design. */
export const APP_THEMES: ThemePreview[] = [
  {
    id: "premium-dark",
    label: "Premium Dark",
    description: "Tiefes Premium-Schwarz",
    preview: "#6d5dfe",
    previewSecondary: "#08080c",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "deep-dark",
    label: "Deep Dark",
    description: "Maximaler Kontrast",
    preview: "#818cf8",
    previewSecondary: "#050508",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "NEXFORM Standard",
    preview: "#6d5dfe",
    previewSecondary: "#0a0a0f",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Neutrales Dunkelgrau",
    preview: "#94a3b8",
    previewSecondary: "#111827",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "carbon",
    label: "Carbon",
    description: "Technisches Anthrazit",
    preview: "#a1a1aa",
    previewSecondary: "#0c0c0e",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "oled-black",
    label: "OLED Black",
    description: "Echtes Schwarz",
    preview: "#6d5dfe",
    previewSecondary: "#000000",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "dark",
    label: "Dark",
    description: "Klassisches Dark",
    preview: "#3b82f6",
    previewSecondary: "#09090b",
    colorMode: "dark",
    featured: true,
  },
  {
    id: "soft-light",
    label: "Soft Light",
    description: "Helles Soft-UI",
    preview: "#6366f1",
    previewSecondary: "#f8fafc",
    colorMode: "light",
    featured: true,
  },
  {
    id: "clean-light",
    label: "Clean Light",
    description: "Klar und reduziert",
    preview: "#3b82f6",
    previewSecondary: "#f4f7fa",
    colorMode: "light",
    featured: true,
  },
  {
    id: "premium-light",
    label: "Premium Light",
    description: "Helles Premium",
    preview: "#6d5dfe",
    previewSecondary: "#fafafa",
    colorMode: "light",
    featured: true,
  },
  {
    id: "arctic",
    label: "Arctic",
    description: "Kühles Hellblau",
    preview: "#0ea5e9",
    previewSecondary: "#f0f9ff",
    colorMode: "light",
    featured: true,
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Fast monochrom",
    preview: "#27272a",
    previewSecondary: "#fafafa",
    colorMode: "light",
    featured: true,
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
    id: "red",
    label: "Red",
    preview: "#dc2626",
    previewSecondary: "#fef2f2",
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
    id: "high-contrast",
    label: "High Contrast",
    preview: "#000000",
    previewSecondary: "#ffffff",
    colorMode: "light",
  },
];

/** Featured packs for the main Design grid. */
export const APPEARANCE_PACKS = APP_THEMES.filter((t) => t.featured);

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "violet", label: "Violet", hex: "#6d5dfe" },
  { id: "blue", label: "Blue", hex: "#3b82f6" },
  { id: "cyan", label: "Cyan", hex: "#06b6d4" },
  { id: "sky", label: "Sky", hex: "#0ea5e9" },
  { id: "green", label: "Green", hex: "#22c55e" },
  { id: "emerald", label: "Emerald", hex: "#10b981" },
  { id: "lime", label: "Lime", hex: "#84cc16" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "amber", label: "Amber", hex: "#f59e0b" },
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "rose", label: "Rose", hex: "#f43f5e" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "magenta", label: "Magenta", hex: "#d946ef" },
  { id: "purple", label: "Purple", hex: "#a855f7" },
  { id: "indigo", label: "Indigo", hex: "#6366f1" },
  { id: "teal", label: "Teal", hex: "#14b8a6" },
];

export const DESIGN_COMBOS: DesignCombo[] = [
  { id: "midnight-violet", label: "Midnight + Violet", appearance: "midnight", accent: "violet" },
  { id: "midnight-blue", label: "Midnight + Blue", appearance: "midnight", accent: "blue" },
  { id: "graphite-cyan", label: "Graphite + Cyan", appearance: "graphite", accent: "cyan" },
  { id: "carbon-purple", label: "Carbon + Purple", appearance: "carbon", accent: "purple" },
  { id: "premium-emerald", label: "Dark + Emerald", appearance: "premium-dark", accent: "emerald" },
  { id: "deep-orange", label: "Dark + Orange", appearance: "deep-dark", accent: "orange" },
  { id: "soft-blue", label: "Light + Blue", appearance: "soft-light", accent: "blue" },
  { id: "clean-violet", label: "Light + Violet", appearance: "clean-light", accent: "violet" },
  { id: "soft-emerald", label: "Light + Emerald", appearance: "soft-light", accent: "emerald" },
  { id: "arctic-cyan", label: "Arctic + Cyan", appearance: "arctic", accent: "cyan" },
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
  "system",
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

export const DEFAULT_THEME: AppThemeId = "midnight";
export const DEFAULT_ACCENT: AccentId = "violet";
export const DEFAULT_DENSITY: UiDensity = "standard";
export const DEFAULT_COLOR_MODE: ColorMode = "dark";
export const DEFAULT_APPEARANCE: AppThemeId = DEFAULT_THEME;

const STORAGE_THEME = "app-theme";
const STORAGE_ACCENT = "app-accent";
const STORAGE_DENSITY = "app-density";
const STORAGE_COLOR_MODE = "app-color-mode";

const LEGACY_TO_PACK: Partial<Record<string, AppThemeId>> = {
  turquoise: "ocean",
  blue: "clean-light",
  green: "forest",
  orange: "sand",
  yellow: "sand",
  gold: "sand",
  pink: "rose",
  white: "pure-white",
  gray: "graphite",
  light: "soft-light",
  "premium-light": "premium-light",
  system: "midnight",
};

const ACCENT_IDS = new Set(ACCENT_OPTIONS.map((a) => a.id));

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && ACCENT_IDS.has(value as AccentId);
}

/** Parse profile.theme which may be "midnight" or "midnight:emerald". */
export function parseStoredTheme(raw: string | null | undefined): {
  appearance: AppThemeId;
  accent: AccentId;
} {
  if (!raw || typeof raw !== "string") {
    return { appearance: DEFAULT_THEME, accent: DEFAULT_ACCENT };
  }
  const [appearancePart, accentPart] = raw.split(":");
  return {
    appearance: normalizeThemeId(appearancePart),
    accent: isAccentId(accentPart) ? accentPart : DEFAULT_ACCENT,
  };
}

export function formatStoredTheme(appearance: AppThemeId, accent: AccentId): string {
  if (accent === DEFAULT_ACCENT) return appearance;
  return `${appearance}:${accent}`;
}

export function isValidThemeId(id: string): id is AppThemeId {
  const appearance = id.includes(":") ? id.split(":")[0]! : id;
  return (
    APP_THEMES.some((t) => t.id === appearance) ||
    LEGACY_THEME_IDS.includes(appearance as AppThemeId)
  );
}

export function normalizeThemeId(id: string | null | undefined): AppThemeId {
  if (!id) return DEFAULT_THEME;
  const appearance = id.includes(":") ? id.split(":")[0]! : id;
  if (APP_THEMES.some((t) => t.id === appearance)) return appearance as AppThemeId;
  const mapped = LEGACY_TO_PACK[appearance];
  if (mapped) return mapped;
  if (LEGACY_THEME_IDS.includes(appearance as AppThemeId)) {
    return appearance as AppThemeId;
  }
  return DEFAULT_THEME;
}

export function resolveAccent(value: string | null | undefined): AccentId {
  return parseStoredTheme(value).accent;
}

export function themeDefaultColorMode(theme: AppThemeId): ColorMode {
  const pack = APP_THEMES.find((t) => t.id === theme);
  if (pack) return pack.colorMode;
  return DEFAULT_COLOR_MODE;
}

export function getThemeMeta(id: AppThemeId): ThemePreview {
  return APP_THEMES.find((t) => t.id === id) ?? APP_THEMES.find((t) => t.id === DEFAULT_THEME)!;
}

export function getAccentMeta(id: AccentId): AccentOption {
  return ACCENT_OPTIONS.find((a) => a.id === id) ?? ACCENT_OPTIONS[0]!;
}

export function readStoredPreferences(): {
  theme: AppThemeId;
  accent: AccentId;
  density: UiDensity;
  colorMode: ColorMode;
} {
  if (typeof window === "undefined") {
    return {
      theme: DEFAULT_THEME,
      accent: DEFAULT_ACCENT,
      density: DEFAULT_DENSITY,
      colorMode: DEFAULT_COLOR_MODE,
    };
  }
  try {
    const rawTheme = localStorage.getItem(STORAGE_THEME);
    const parsed = parseStoredTheme(rawTheme);
    const storedAccent = localStorage.getItem(STORAGE_ACCENT);
    // Prefer explicit accent key; fall back to compound theme string.
    const resolvedAccent = isAccentId(storedAccent)
      ? storedAccent
      : parsed.accent;
    const theme = parsed.appearance;
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
      accent: resolvedAccent,
      density: UI_DENSITY_OPTIONS.some((d) => d.id === density)
        ? density
        : DEFAULT_DENSITY,
      colorMode,
    };
  } catch {
    return {
      theme: DEFAULT_THEME,
      accent: DEFAULT_ACCENT,
      density: DEFAULT_DENSITY,
      colorMode: DEFAULT_COLOR_MODE,
    };
  }
}

export function applyThemeToDocument(
  theme: AppThemeId,
  density: UiDensity,
  colorMode: ColorMode = DEFAULT_COLOR_MODE,
  accent: AccentId = DEFAULT_ACCENT
) {
  if (typeof document === "undefined") return;
  try {
    const normalized = normalizeThemeId(theme);
    const resolvedAccent = isAccentId(accent) ? accent : DEFAULT_ACCENT;
    document.documentElement.dataset.theme = normalized;
    document.documentElement.dataset.appearance = normalized;
    document.documentElement.dataset.accent = resolvedAccent;
    document.documentElement.dataset.density = density;
    document.documentElement.dataset.colorMode = colorMode;
    document.documentElement.classList.toggle("light", colorMode === "light");
    document.documentElement.classList.toggle("dark", colorMode !== "light");
    localStorage.setItem(STORAGE_THEME, formatStoredTheme(normalized, resolvedAccent));
    localStorage.setItem(STORAGE_ACCENT, resolvedAccent);
    localStorage.setItem(STORAGE_DENSITY, density);
    localStorage.setItem(STORAGE_COLOR_MODE, colorMode);
  } catch {
    /* private mode / storage blocked */
  }
}
