"use client";

import { Check } from "lucide-react";
import { usePreferences } from "@/components/providers/preferences-provider";
import {
  APPEARANCE_PACKS,
  ACCENT_OPTIONS,
  DESIGN_COMBOS,
  COLOR_MODE_OPTIONS,
  UI_DENSITY_OPTIONS,
  getAccentMeta,
  type AppThemeId,
  type AccentId,
} from "@/lib/themes";
import { cn } from "@/lib/utils";

function DesignPreviewCard({
  bg,
  card,
  accent,
  text,
  muted,
  active,
  label,
  onClick,
}: {
  bg: string;
  card: string;
  accent: string;
  text: string;
  muted: string;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border p-2 text-left transition-all",
        active
          ? "border-accent bg-accent/5 ring-2 ring-accent/30"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/[0.08] dark:bg-white/[0.02]"
      )}
    >
      <div
        className="overflow-hidden rounded-xl border border-black/5 p-2.5 dark:border-white/10"
        style={{ background: bg }}
        aria-hidden
      >
        <div
          className="rounded-lg p-2.5 shadow-sm"
          style={{ background: card }}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold" style={{ color: muted }}>
              Design Preview
            </span>
            <span
              className="h-1.5 w-8 rounded-full"
              style={{ background: accent }}
            />
          </div>
          <div
            className="mb-1 text-[11px] font-bold tabular-nums"
            style={{ color: text }}
          >
            Calories{" "}
            <span style={{ color: accent }}>2.942</span>
          </div>
          <div
            className="mb-2 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: `${muted}33` }}
          >
            <div
              className="h-full w-2/3 rounded-full"
              style={{ background: accent }}
            />
          </div>
          <div
            className="inline-flex rounded-md px-2 py-1 text-[9px] font-semibold"
            style={{ background: accent, color: "#fff" }}
          >
            Button
          </div>
        </div>
      </div>
      <span
        className={cn(
          "px-0.5 text-[12px] font-semibold leading-tight",
          active ? "text-accent" : "text-zinc-800 dark:text-zinc-200"
        )}
      >
        {label}
      </span>
      {active ? (
        <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-accent" />
      ) : null}
    </button>
  );
}

export function SettingsDesignPanel() {
  const {
    theme,
    accent,
    colorMode,
    uiDensity,
    setTheme,
    setAccent,
    setDesign,
    setColorMode,
    setUiDensity,
  } = usePreferences();

  const accentHex = getAccentMeta(accent).hex;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          Design
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Theme, Akzentfarbe und Darstellung — live auf der gesamten App
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
        <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Fertige Kombinationen
        </h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {DESIGN_COMBOS.map((combo) => {
            const pack = APPEARANCE_PACKS.find((p) => p.id === combo.appearance);
            const accentMeta = getAccentMeta(combo.accent);
            const active = theme === combo.appearance && accent === combo.accent;
            return (
              <DesignPreviewCard
                key={combo.id}
                bg={pack?.previewSecondary ?? "#0a0a0f"}
                card={
                  pack?.colorMode === "light"
                    ? "#ffffff"
                    : "rgba(255,255,255,0.06)"
                }
                accent={accentMeta.hex}
                text={pack?.colorMode === "light" ? "#0f172a" : "#ffffff"}
                muted={pack?.colorMode === "light" ? "#64748b" : "#8e8e93"}
                active={active}
                label={combo.label}
                onClick={() => setDesign(combo.appearance, combo.accent)}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Theme / Grundstil
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {APPEARANCE_PACKS.map((t) => {
            const active = theme === t.id;
            return (
              <DesignPreviewCard
                key={t.id}
                bg={t.previewSecondary ?? "#0a0a0f"}
                card={
                  t.colorMode === "light" ? "#ffffff" : "rgba(255,255,255,0.06)"
                }
                accent={active ? accentHex : t.preview}
                text={t.colorMode === "light" ? "#0f172a" : "#ffffff"}
                muted={t.colorMode === "light" ? "#64748b" : "#8e8e93"}
                active={active}
                label={t.label}
                onClick={() => setTheme(t.id as AppThemeId)}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Akzentfarbe
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {ACCENT_OPTIONS.map((a) => {
            const active = accent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAccent(a.id as AccentId)}
                aria-pressed={active}
                aria-label={a.label}
                title={a.label}
                className={cn(
                  "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 transition-all",
                  active
                    ? "border-accent ring-2 ring-accent/40"
                    : "border-zinc-200 dark:border-white/[0.08]"
                )}
              >
                <span
                  className="h-7 w-7 rounded-full shadow-sm"
                  style={{ background: a.hex }}
                />
                <span className="text-[9px] font-medium text-zinc-600 dark:text-zinc-400">
                  {a.label}
                </span>
                {active ? (
                  <Check className="absolute right-1 top-1 h-3 w-3 text-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
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
              <span className="mt-0.5 block text-[11px] text-zinc-500">
                {d.hint}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
