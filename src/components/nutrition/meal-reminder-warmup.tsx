"use client";

import { useEffect } from "react";
import {
  mealRemindersEnabled,
  msUntilNextSlot,
} from "@/lib/meal-reminders";

/**
 * When meal reminders are enabled, schedule the next browser notification
 * for breakfast / lunch / dinner (tab must stay open).
 */
export function MealReminderWarmup() {
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const clear = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };

    const schedule = () => {
      clear();
      if (cancelled || !mealRemindersEnabled()) return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      const { ms, label } = msUntilNextSlot();
      timer = window.setTimeout(() => {
        if (cancelled || !mealRemindersEnabled()) return;
        try {
          new Notification("NEXFORM", {
            body: `Zeit für ${label} — Mahlzeit loggen?`,
            tag: `meal-reminder-${label}`,
          });
        } catch {
          /* ignore */
        }
        schedule();
      }, Math.min(ms, 2_147_000_000));
    };

    schedule();
    const onChange = () => schedule();
    window.addEventListener("nexform:meal-reminders-changed", onChange);
    window.addEventListener("storage", onChange);

    return () => {
      cancelled = true;
      clear();
      window.removeEventListener("nexform:meal-reminders-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  return null;
}
