"use client";

import { memo, useCallback, useState } from "react";
import Link from "next/link";
import { hapticTap } from "@/lib/haptic";
import { nutritionDayKey } from "@/lib/nutrition-day";
import { isValidDashboardPayload } from "@/lib/nutrition-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

type Props = {
  nutrition: NutritionDashboardPayload;
  applyDashboard: (next: NutritionDashboardPayload) => void;
  workoutHref: string;
  workoutLabel: string;
};

const BTN =
  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-1 py-2 text-[11px] font-semibold text-zinc-300 active:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

function IconPlusFood() {
  return (
    <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconWater() {
  return (
    <svg className="h-4 w-4 text-sky-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3s6 7 6 11a6 6 0 1 1-12 0c0-4 6-11 6-11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconScale() {
  return (
    <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h16M12 8v12M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconDumbbell() {
  return (
    <svg className="h-4 w-4 text-violet-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8v8M18 8v8M6 12h12M4 10v4M20 10v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const HomeQuickActions = memo(function HomeQuickActions({
  nutrition,
  applyDashboard,
  workoutHref,
  workoutLabel,
}: Props) {
  const [waterBusy, setWaterBusy] = useState(false);

  const addWater = useCallback(async () => {
    if (waterBusy) return;
    hapticTap();
    setWaterBusy(true);
    const nextMl = Math.max(0, (nutrition.water?.consumedMl ?? 0) + 250);
    applyDashboard({
      ...nutrition,
      date: nutritionDayKey(),
      water: { ...nutrition.water, consumedMl: nextMl },
    });
    try {
      const res = await fetch("/api/nutrition/water", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl: 250, date: nutritionDayKey() }),
      });
      const body = await res.json().catch(() => null);
      if (body?.dashboard && isValidDashboardPayload(body.dashboard)) {
        applyDashboard(body.dashboard);
      } else if (!res.ok) {
        applyDashboard(nutrition);
      }
    } catch {
      applyDashboard(nutrition);
    } finally {
      setWaterBusy(false);
    }
  }, [applyDashboard, nutrition, waterBusy]);

  return (
    <div className="grid grid-cols-4 gap-2">
      <Link href="/nutrition?add=LUNCH" prefetch className={BTN} aria-label="Essen hinzufügen" onClick={() => hapticTap()}>
        <IconPlusFood />
        Essen
      </Link>
      <button
        type="button"
        className={BTN}
        aria-label="250 ml Wasser hinzufügen"
        disabled={waterBusy}
        onClick={() => void addWater()}
      >
        <IconWater />
        Wasser
      </button>
      <Link href="/progress?log=1" prefetch className={BTN} aria-label="Gewicht eintragen" onClick={() => hapticTap()}>
        <IconScale />
        Gewicht
      </Link>
      <Link
        href={workoutHref}
        prefetch
        className={BTN}
        aria-label={workoutLabel}
        onClick={() => hapticTap()}
      >
        <IconDumbbell />
        {workoutLabel === "Weiter" ? "Weiter" : "Workout"}
      </Link>
    </div>
  );
});
