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
  const stored = readStoredPreferences();
  const [theme, setThemeState] = useState<AppThemeId>(stored.theme);
  const [uiDensity, setUiDensityState] = useState<UiDensity>(stored.density);
  const [colorMode, setColorModeState] = useState<ColorMode>(stored.colorMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    applyThemeToDocument(theme, uiDensity, colorMode);
  }, [theme, uiDensity, colorMode]);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.theme) {
          setThemeState(d.theme);
          setUiDensityState(d.uiDensity ?? DEFAULT_DENSITY);
          setColorModeState(d.colorMode === "light" ? "light" : "dark");
          applyThemeToDocument(
            d.theme,
            d.uiDensity ?? DEFAULT_DENSITY,
            d.colorMode === "light" ? "light" : "dark"
          );
        }
      })
      .finally(() => setReady(true));
  }, []);

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
