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
  type ColorMode,
  type UiDensity,
  applyThemeToDocument,
  readStoredPreferences,
  DEFAULT_THEME,
  DEFAULT_DENSITY,
  DEFAULT_COLOR_MODE,
} from "@/lib/themes";

type PreferencesContextValue = {
  theme: AppThemeId;
  uiDensity: UiDensity;
  colorMode: ColorMode;
  setTheme: (t: AppThemeId) => void;
  setUiDensity: (d: UiDensity) => void;
  setColorMode: (m: ColorMode) => void;
  ready: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe defaults — hydrate from localStorage only after mount (avoids mismatch crashes)
  const [theme, setThemeState] = useState<AppThemeId>(DEFAULT_THEME);
  const [uiDensity, setUiDensityState] = useState<UiDensity>(DEFAULT_DENSITY);
  const [colorMode, setColorModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredPreferences();
    setThemeState(stored.theme);
    setUiDensityState(stored.density);
    setColorModeState(stored.colorMode);
    applyThemeToDocument(stored.theme, stored.density, stored.colorMode);

    let cancelled = false;
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.theme) return;
        const nextDensity = d.uiDensity ?? DEFAULT_DENSITY;
        const nextMode = d.colorMode === "light" ? "light" : "dark";
        setThemeState(d.theme);
        setUiDensityState(nextDensity);
        setColorModeState(nextMode);
        applyThemeToDocument(d.theme, nextDensity, nextMode);
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
    applyThemeToDocument(theme, uiDensity, colorMode);
  }, [theme, uiDensity, colorMode, ready]);

  const persist = useCallback(
    (next: { theme?: AppThemeId; uiDensity?: UiDensity; colorMode?: ColorMode }) => {
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
      setThemeState(t);
      applyThemeToDocument(t, uiDensity, colorMode);
      persist({ theme: t });
    },
    [uiDensity, colorMode, persist]
  );

  const setUiDensity = useCallback(
    (d: UiDensity) => {
      setUiDensityState(d);
      applyThemeToDocument(theme, d, colorMode);
      persist({ uiDensity: d });
    },
    [theme, colorMode, persist]
  );

  const setColorMode = useCallback(
    (m: ColorMode) => {
      setColorModeState(m);
      applyThemeToDocument(theme, uiDensity, m);
      persist({ colorMode: m });
    },
    [theme, uiDensity, persist]
  );

  const value = useMemo(
    () => ({
      theme,
      uiDensity,
      colorMode,
      setTheme,
      setUiDensity,
      setColorMode,
      ready,
    }),
    [theme, uiDensity, colorMode, setTheme, setUiDensity, setColorMode, ready]
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
      uiDensity: DEFAULT_DENSITY as UiDensity,
      colorMode: DEFAULT_COLOR_MODE as ColorMode,
      setTheme: () => {},
      setUiDensity: () => {},
      setColorMode: () => {},
      ready: false,
    };
  }
  return ctx;
}
