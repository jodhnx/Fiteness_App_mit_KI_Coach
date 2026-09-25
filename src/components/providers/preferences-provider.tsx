"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type AppThemeId,
  type AccentId,
  type ColorMode,
  type UiDensity,
  applyThemeToDocument,
  readStoredPreferences,
  normalizeThemeId,
  parseStoredTheme,
  themeDefaultColorMode,
  DEFAULT_THEME,
  DEFAULT_ACCENT,
  DEFAULT_DENSITY,
  DEFAULT_COLOR_MODE,
  isAccentId,
} from "@/lib/themes";

type PreferencesContextValue = {
  theme: AppThemeId;
  accent: AccentId;
  uiDensity: UiDensity;
  colorMode: ColorMode;
  setTheme: (t: AppThemeId) => void;
  setAccent: (a: AccentId) => void;
  setDesign: (appearance: AppThemeId, accent: AccentId) => void;
  setUiDensity: (d: UiDensity) => void;
  setColorMode: (m: ColorMode) => void;
  ready: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppThemeId>(DEFAULT_THEME);
  const [accent, setAccentState] = useState<AccentId>(DEFAULT_ACCENT);
  const [uiDensity, setUiDensityState] = useState<UiDensity>(DEFAULT_DENSITY);
  const [colorMode, setColorModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredPreferences();
    setThemeState(stored.theme);
    setAccentState(stored.accent);
    setUiDensityState(stored.density);
    setColorModeState(stored.colorMode);
    applyThemeToDocument(stored.theme, stored.density, stored.colorMode, stored.accent);

    let cancelled = false;
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.theme) return;
        const parsed = parseStoredTheme(d.theme);
        const nextTheme = normalizeThemeId(d.theme);
        const nextAccent =
          isAccentId(d.accent) ? d.accent : parsed.accent;
        const nextDensity = d.uiDensity ?? DEFAULT_DENSITY;
        const nextMode =
          d.colorMode === "light" || d.colorMode === "dark"
            ? d.colorMode
            : themeDefaultColorMode(nextTheme);
        setThemeState(nextTheme);
        setAccentState(nextAccent);
        setUiDensityState(nextDensity);
        setColorModeState(nextMode);
        applyThemeToDocument(nextTheme, nextDensity, nextMode, nextAccent);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyThemeToDocument(theme, uiDensity, colorMode, accent);
  }, [theme, accent, uiDensity, colorMode, ready]);

  const persist = useCallback(
    (next: {
      theme?: AppThemeId;
      accent?: AccentId;
      uiDensity?: UiDensity;
      colorMode?: ColorMode;
    }) => {
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    },
    []
  );

  const setTheme = useCallback(
    (t: AppThemeId) => {
      const normalized = normalizeThemeId(t);
      const nextMode = themeDefaultColorMode(normalized);
      setThemeState(normalized);
      setColorModeState(nextMode);
      applyThemeToDocument(normalized, uiDensity, nextMode, accent);
      persist({ theme: normalized, accent, colorMode: nextMode });
    },
    [uiDensity, accent, persist]
  );

  const setAccent = useCallback(
    (a: AccentId) => {
      if (!isAccentId(a)) return;
      setAccentState(a);
      applyThemeToDocument(theme, uiDensity, colorMode, a);
      persist({ theme, accent: a });
    },
    [theme, uiDensity, colorMode, persist]
  );

  const setDesign = useCallback(
    (appearance: AppThemeId, nextAccent: AccentId) => {
      const normalized = normalizeThemeId(appearance);
      const resolvedAccent = isAccentId(nextAccent) ? nextAccent : DEFAULT_ACCENT;
      const nextMode = themeDefaultColorMode(normalized);
      setThemeState(normalized);
      setAccentState(resolvedAccent);
      setColorModeState(nextMode);
      applyThemeToDocument(normalized, uiDensity, nextMode, resolvedAccent);
      persist({ theme: normalized, accent: resolvedAccent, colorMode: nextMode });
    },
    [uiDensity, persist]
  );

  const setUiDensity = useCallback(
    (d: UiDensity) => {
      setUiDensityState(d);
      applyThemeToDocument(theme, d, colorMode, accent);
      persist({ uiDensity: d });
    },
    [theme, accent, colorMode, persist]
  );

  const setColorMode = useCallback(
    (m: ColorMode) => {
      setColorModeState(m);
      applyThemeToDocument(theme, uiDensity, m, accent);
      persist({ colorMode: m });
    },
    [theme, accent, uiDensity, persist]
  );

  const value = useMemo(
    () => ({
      theme,
      accent,
      uiDensity,
      colorMode,
      setTheme,
      setAccent,
      setDesign,
      setUiDensity,
      setColorMode,
      ready,
    }),
    [
      theme,
      accent,
      uiDensity,
      colorMode,
      setTheme,
      setAccent,
      setDesign,
      setUiDensity,
      setColorMode,
      ready,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    return {
      theme: DEFAULT_THEME as AppThemeId,
      accent: DEFAULT_ACCENT as AccentId,
      uiDensity: DEFAULT_DENSITY as UiDensity,
      colorMode: DEFAULT_COLOR_MODE as ColorMode,
      setTheme: () => {},
      setAccent: () => {},
      setDesign: () => {},
      setUiDensity: () => {},
      setColorMode: () => {},
      ready: false,
    };
  }
  return ctx;
}
