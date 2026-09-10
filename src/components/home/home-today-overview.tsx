"use client";

import { memo } from "react";
import Link from "next/link";
import { Droplets, Flame, Footprints } from "lucide-react";
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
  steps?: number;
  stepGoal?: number;
  trainingHint?: string | null;
};

const MACROS = [
  { key: "protein", label: "Protein", field: "proteinG" as const, tint: "text-rose-400" },
  { key: "carbs", label: "Kohlenhydrate", field: "carbsG" as const, tint: "text-amber-400" },
  { key: "fat", label: "Fett", field: "fatG" as const, tint: "text-sky-400" },
];

/** Dominant home today overview — calories + macros first, activity compact. */
export const HomeTodayOverview = memo(function HomeTodayOverview({
  nutrition,
  loading = false,
  steps = 0,
  stepGoal = 10_000,
  trainingHint = null,
}: Props) {
  const state = resolveNutritionDisplayState(nutrition, { loading });

  if (state.kind === "loading") {
    return (
      <PremiumCard padding="md" className="space-y-4 min-h-[17.5rem]">
        <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
        <div className="h-12 w-36 rounded bg-white/5 animate-pulse" />
        <div className="h-4 w-24 rounded bg-white/5 animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-12 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </PremiumCard>
    );
  }

  if (state.kind === "missing_target") {
    return (
      <PremiumCard padding="md" className="text-center space-y-3 min-h-[17.5rem] flex flex-col justify-center">
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
  const waterMl = nutrition.water?.consumedMl ?? 0;
  const waterTarget = nutrition.water?.targetMl ?? 2500;
  const burned = Math.round(nutrition.exerciseBurned?.calories ?? 0);

  const proteinLeft = Math.max(0, Math.round((targets.proteinG ?? 0) - (consumed.proteinG ?? 0)));
  const cue =
    proteinLeft >= 20
      ? `Protein fehlen noch ${proteinLeft} g.`
      : trainingHint
        ? trainingHint
        : null;

  return (
    <PremiumCard
      padding="md"
      className={cn("space-y-4", cal.isOver && "ring-1 ring-red-500/25")}
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
          {cal.isOver ? "kcal über dem Ziel" : "kcal übrig"}
        </p>
        <p className="mt-1 text-xs text-zinc-500 tabular-nums">{cal.secondaryLine}</p>
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

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-white/[0.05] px-2 py-2 min-h-11">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <Footprints className="h-3 w-3" aria-hidden />
            Schritte
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-white">
            {steps.toLocaleString("de-DE")}
            <span className="text-[10px] font-medium text-zinc-500">
              {" "}
              / {stepGoal.toLocaleString("de-DE")}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.05] px-2 py-2 min-h-11">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <Flame className="h-3 w-3" aria-hidden />
            Aktiv
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-white">
            {burned.toLocaleString("de-DE")}
            <span className="text-[10px] font-medium text-zinc-500"> kcal</span>
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.05] px-2 py-2 min-h-11">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            <Droplets className="h-3 w-3" aria-hidden />
            Wasser
          </p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-white">
            {waterMl}
            <span className="text-[10px] font-medium text-zinc-500">
              {" "}
              / {waterTarget} ml
            </span>
          </p>
        </div>
      </div>

      {cue ? (
        <p className="text-[13px] leading-snug text-zinc-400">{cue}</p>
      ) : null}
    </PremiumCard>
  );
});
