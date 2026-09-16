"use client";

import { Check } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-provider";
import {
  APP_THEMES,
  COLOR_MODE_OPTIONS,
  UI_DENSITY_OPTIONS,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

const COLOR_MODE_HINT: Record<string, string> = {
  light: "Hell",
  dark: "Dunkel",
};

export function SettingsDesignPanel() {
  const { theme, colorMode, uiDensity, setTheme, setColorMode, setUiDensity } =
    usePreferences();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          Design
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Theme, Helligkeit und Darstellungsdichte
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 px-0.5">
          Helligkeit
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_MODE_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setColorMode(m.id)}
              className={cn(
                "relative min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                colorMode === m.id
                  ? "border-accent bg-accent text-white"
                  : "border-zinc-200 text-zinc-700 dark:border-white/[0.08] dark:text-zinc-300"
              )}
            >
              {m.label}
              {colorMode === m.id ? (
                <Check className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 px-0.5">
          Themes
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {APP_THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  "relative flex min-h-[4.5rem] flex-col gap-1.5 rounded-xl border p-2 text-left transition-all",
                  active
                    ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/[0.08] dark:bg-white/[0.02]"
                )}
                aria-pressed={active}
              >
                <div
                  className="flex h-8 w-full overflow-hidden rounded-lg border border-black/5 dark:border-white/10"
                  aria-hidden
                >
                  <span className="w-2/5" style={{ background: t.preview }} />
                  <span
                    className="flex-1"
                    style={{
                      background: t.previewSecondary ?? "#ffffff",
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "text-[12px] font-semibold leading-tight",
                    active ? "text-accent" : "text-zinc-800 dark:text-zinc-200"
                  )}
                >
                  {t.label}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {COLOR_MODE_HINT[t.colorMode] ?? t.colorMode}
                </span>
                {active ? (
                  <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 px-0.5">
          Dichte
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {UI_DENSITY_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setUiDensity(d.id)}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2.5 text-left transition-colors",
                uiDensity === d.id
                  ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                  : "border-zinc-200 bg-zinc-50/80 dark:border-white/[0.08] dark:bg-white/[0.03]"
              )}
            >
              <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {d.label}
              </span>
              <span className="block text-[11px] text-zinc-500 mt-0.5">
                {d.hint}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
