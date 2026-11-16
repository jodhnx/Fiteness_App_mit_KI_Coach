"use client";

import { useEffect, useState, useMemo } from "react";
import { isBootSettled } from "@/lib/app-init";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

export const FIRST_SETUP_FLAG = "nexform:first-setup";

const STEPS = [
  { at: 8, label: "Benutzerprofil wird erstellt…" },
  { at: 22, label: "Persönliche Einstellungen werden geladen…" },
  { at: 38, label: "Trainingsziele werden verarbeitet…" },
  { at: 55, label: "Kalorien- und Makroziele werden berechnet…" },
  { at: 72, label: "Trainings- und Ernährungsdaten werden initialisiert…" },
  { at: 88, label: "Dashboard wird vorbereitet…" },
  { at: 100, label: "Fertig — willkommen bei NEXFORM" },
] as const;

/**
 * Real first-run init screen after registration/onboarding.
 * Progress tracks boot events + nutrition readiness — no fake delays.
 */
export function FirstSetupOverlay({
  nutrition,
}: {
  nutrition: NutritionDashboardPayload | null;
}) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(FIRST_SETUP_FLAG) !== "1") return;
    } catch {
      return;
    }
    if (nutrition != null && hasNutritionTargets(nutrition) && isBootSettled()) {
      try {
        sessionStorage.removeItem(FIRST_SETUP_FLAG);
      } catch {
        /* ignore */
      }
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [nutrition]);

  useEffect(() => {
    if (!visible) return;
    const onProgress = (e: Event) => {
      const p = (e as CustomEvent<{ progress?: number }>).detail?.progress;
      if (typeof p === "number" && Number.isFinite(p)) {
        setProgress((prev) => Math.max(prev, Math.min(100, Math.round(p))));
      }
    };
    window.addEventListener("nexform:boot-progress", onProgress);
    return () => window.removeEventListener("nexform:boot-progress", onProgress);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const ready =
      isBootSettled() &&
      nutrition != null &&
      hasNutritionTargets(nutrition);
    if (!ready) return;
    setProgress(100);
    const t = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(FIRST_SETUP_FLAG);
      } catch {
        /* ignore */
      }
      setVisible(false);
    }, 350);
    return () => window.clearTimeout(t);
  }, [visible, nutrition]);

  // Safety net — never block forever
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(FIRST_SETUP_FLAG);
      } catch {
        /* ignore */
      }
      setVisible(false);
    }, 20_000);
    return () => window.clearTimeout(t);
  }, [visible]);

  const status = useMemo(() => {
    let label: string = STEPS[0]!.label;
    for (const s of STEPS) {
      if (progress >= s.at) label = s.label;
    }
    return label;
  }, [progress]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--background)] px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Einrichtung"
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-2xl font-extrabold tracking-tight text-accent">
            NEXFORM
          </p>
          <h1 className="text-lg font-semibold text-[var(--foreground)]">
            Dein persönlicher Bereich wird vorbereitet
          </h1>
          <p className="text-sm text-zinc-500">{status}</p>
        </div>

        <div className="space-y-2">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
            {progress}&nbsp;%
          </p>
        </div>

        <ul className="space-y-1.5 text-left text-[12px] text-zinc-500">
          {STEPS.slice(0, -1).map((s) => (
            <li
              key={s.at}
              className={
                progress >= s.at
                  ? "text-zinc-800 dark:text-zinc-200"
                  : "opacity-50"
              }
            >
              {progress >= s.at ? "✓" : "○"} {s.label.replace("…", "")}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
