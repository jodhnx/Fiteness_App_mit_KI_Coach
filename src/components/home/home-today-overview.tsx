"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  getMacroDisplay,
  resolveNutritionDisplayState,
} from "@/lib/nutrition-display";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";

type Props = {
  nutrition: NutritionDashboardPayload;
  loading?: boolean;
};

const MACROS = [
  { key: "protein", label: "Protein", field: "proteinG" as const, tint: "text-rose-400" },
  { key: "carbs", label: "Kohlenhydrate", field: "carbsG" as const, tint: "text-amber-400" },
  { key: "fat", label: "Fett", field: "fatG" as const, tint: "text-sky-400" },
];

/** Dominant home today overview — calories + macros first. */
export const HomeTodayOverview = memo(function HomeTodayOverview({
  nutrition,
  loading = false,
}: Props) {
  const state = resolveNutritionDisplayState(nutrition, { loading });

  if (state.kind === "loading") {
    return (
      <PremiumCard glow padding="md" className="animate-pulse space-y-4">
        <div className="h-3 w-16 rounded bg-white/5" />
        <div className="h-12 w-40 rounded bg-white/5" />
        <div className="h-4 w-56 rounded bg-white/5" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="h-16 rounded-2xl bg-white/5" />
        </div>
      </PremiumCard>
    );
  }

  if (state.kind === "missing_target") {
    return (
      <PremiumCard glow padding="md" className="text-center space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Heute
        </p>
        <p className="text-lg font-semibold text-white">Kalorienziel festlegen</p>
        <p className="text-sm text-zinc-400">
          {state.profileIncomplete
            ? "Vervollständige dein Profil, damit wir dein Tagesziel berechnen können."
            : "Lege dein Kalorienziel fest, um deine verbleibenden kcal zu sehen."}
        </p>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-black"
        >
          Ziel festlegen
        </Link>
      </PremiumCard>
    );
  }

  const { cal } = state;
  const consumed = nutrition.consumed ?? { proteinG: 0, carbsG: 0, fatG: 0 };
  const targets = nutrition.targets ?? { proteinG: 0, carbsG: 0, fatG: 0 };

  return (
    <PremiumCard
      glow
      padding="md"
      className={cn(
        "space-y-4",
        cal.isOver && "ring-1 ring-red-500/25"
      )}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Heute
        </p>
        <p
          className={cn(
            "mt-2 text-[2.85rem] font-bold leading-none tabular-nums tracking-tight",
            cal.isOver ? "text-red-400" : "text-white"
          )}
        >
          {cal.primaryValue.toLocaleString("de-DE")}
        </p>
        <p
          className={cn(
            "mt-1 text-sm font-semibold uppercase tracking-wide",
            cal.isOver ? "text-red-400/90" : "text-zinc-300"
          )}
        >
          {cal.isOver ? "über dem Ziel" : "übrig"}
        </p>
        <p className="mt-2 text-sm tabular-nums text-zinc-500">{cal.secondaryLine} kcal</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {MACROS.map(({ key, label, field, tint }) => {
          const macro = getMacroDisplay(consumed[field], targets[field], label);
          if (targets[field] <= 0) return null;
          return (
            <div
              key={key}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5"
            >
              <p className={cn("text-[10px] font-semibold uppercase tracking-wide", tint)}>
                {label === "Kohlenhydrate" ? "KH" : label}
              </p>
              <p className="mt-1 text-[13px] font-bold text-white tabular-nums leading-snug">
                {macro.primaryLine.replace(` ${label}`, "").replace(" Protein", "").replace(" Kohlenhydrate", "").replace(" Fett", "")}
              </p>
              <p className="text-[10px] text-zinc-500 tabular-nums mt-0.5">
                {macro.secondaryLine}
              </p>
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
});
