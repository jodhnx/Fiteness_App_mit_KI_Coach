"use client";

import { memo } from "react";
import Link from "next/link";
import { Dumbbell, Flame, Utensils } from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { resolveNutritionDisplayState, getMacroDisplay } from "@/lib/nutrition-display";
import { cn } from "@/lib/utils";

type Props = {
  nutrition: NutritionDashboardPayload;
  trainingStatus: "active" | "done" | "planned" | "open";
  trainingLabel?: string;
  activeSessionId?: string | null;
};

function GlanceCell({
  icon: Icon,
  label,
  primary,
  secondary,
  href,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  primary: string;
  secondary?: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[4.5rem] flex-col justify-center rounded-2xl border px-3 py-2.5",
        "active:scale-[0.99] transition-transform",
        accent
          ? "border-cyan-500/25 bg-cyan-500/10"
          : "border-white/[0.07] bg-white/[0.02]"
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5", accent ? "text-cyan-400" : "text-zinc-500")} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-bold text-white leading-tight tabular-nums">{primary}</p>
      {secondary && (
        <p className="text-[11px] text-zinc-500 mt-0.5 tabular-nums leading-snug">{secondary}</p>
      )}
    </Link>
  );
}

/** Compact today strip — kcal + protein + training at a glance. */
export const HomeTodayGlance = memo(function HomeTodayGlance({
  nutrition,
  trainingStatus,
  trainingLabel,
  activeSessionId,
}: Props) {
  const calState = resolveNutritionDisplayState(nutrition);
  const cal = calState.kind === "ready" ? calState.cal : null;
  const protein =
    calState.kind === "ready" && (nutrition.targets?.proteinG ?? 0) > 0
      ? getMacroDisplay(
          nutrition.consumed?.proteinG ?? 0,
          nutrition.targets?.proteinG ?? 0,
          "Protein"
        )
      : null;

  const trainPrimary =
    trainingStatus === "active"
      ? "Läuft"
      : trainingStatus === "done"
        ? "Erledigt"
        : trainingLabel ?? "Offen";
  const trainHref =
    trainingStatus === "active" && activeSessionId
      ? `/workouts/live/${activeSessionId}`
      : "/workouts";

  return (
    <section aria-label="Heute auf einen Blick" className="grid grid-cols-3 gap-2">
      <GlanceCell
        icon={Flame}
        label="Kalorien"
        primary={
          calState.kind === "missing_target"
            ? "Ziel fehlt"
            : cal
              ? `${cal.primaryValue.toLocaleString("de-DE")} ${cal.isOver ? "über" : "übrig"}`
              : "—"
        }
        secondary={cal?.secondaryLine ? `${cal.secondaryLine} kcal` : undefined}
        href="/nutrition"
      />
      <GlanceCell
        icon={Utensils}
        label="Protein"
        primary={
          protein?.primaryLine.replace(" Protein übrig", " übrig").replace(" Protein über Ziel", " über") ??
          "—"
        }
        secondary={protein?.secondaryLine}
        href="/nutrition"
      />
      <GlanceCell
        icon={Dumbbell}
        label="Training"
        primary={trainPrimary}
        secondary={
          trainingStatus === "planned" && trainingLabel ? "Heute geplant" : undefined
        }
        href={trainHref}
        accent={trainingStatus === "active"}
      />
    </section>
  );
});
