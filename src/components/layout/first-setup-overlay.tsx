"use client";

import { useEffect, useState } from "react";
import { isBootSettled } from "@/lib/app-init";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

const FLAG = "nexform:first-setup";

/**
 * One-time overlay after registration/onboarding while profile targets hydrate.
 * Never shown on later launches (flag cleared + boot settled / targets ready).
 */
export function FirstSetupOverlay({
  nutrition,
}: {
  nutrition: NutritionDashboardPayload | null;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(FLAG) !== "1") return;
    } catch {
      return;
    }
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const check = () => {
      const ready =
        isBootSettled() ||
        (nutrition != null && hasNutritionTargets(nutrition));
      if (!ready) return false;
      try {
        sessionStorage.removeItem(FLAG);
      } catch {
        /* ignore */
      }
      setVisible(false);
      return true;
    };
    if (check()) return;
    const id = window.setInterval(() => {
      if (check()) window.clearInterval(id);
    }, 200);
    return () => window.clearInterval(id);
  }, [visible, nutrition]);

  // Safety: never block longer than a few seconds if APIs hang
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(FLAG);
      } catch {
        /* ignore */
      }
      setVisible(false);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--background)]/95 px-6"
      role="status"
      aria-live="polite"
      aria-label="Einrichtung"
    >
      <div className="max-w-sm text-center space-y-3">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
          Dein Setup wird vorbereitet
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Profil, Ziele und Tageswerte werden eingerichtet — nur dieses eine Mal.
        </p>
      </div>
    </div>
  );
}
