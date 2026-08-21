"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  hoursUntilFullyRecovered,
  liveRecoveryPercent,
} from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { Activity } from "lucide-react";

type Props = {
  muscles: MuscleRecovery[];
  compact?: boolean;
  showLink?: boolean;
  title?: string;
  variant?: "default" | "section";
};

function RecoveryRow({
  row,
  live,
  premium,
}: {
  row: MuscleRecovery;
  live: number;
  premium?: boolean;
}) {
  const ready = live >= 100;
  const hrs = hoursUntilFullyRecovered(
    live,
    row.hoursToFull ?? row.recoveryHoursRequired,
    row.recoveryPercent
  );
  const bar =
    live >= 85 ? "bg-emerald-500" : live >= 50 ? "bg-amber-400" : "bg-red-500";
  const text =
    live >= 85
      ? "text-emerald-400"
      : live >= 50
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className={cn("space-y-1.5", premium && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-zinc-200 font-medium shrink-0",
            premium ? "text-sm min-w-[5.5rem]" : "text-sm min-w-[5rem]"
          )}
        >
          {row.label}
        </span>
        <span className={cn("text-[11px] tabular-nums font-semibold", text)}>
          {ready
            ? "Bereit"
            : hrs != null
              ? `≈ ${hrs} h`
              : `${live} %`}
        </span>
        <span
          className={cn(
            "tabular-nums font-bold text-right shrink-0",
            premium ? "text-sm w-12" : "text-xs w-10",
            text
          )}
        >
          {live}%
        </span>
      </div>
      <div
        className={cn(
          "rounded-full bg-zinc-800/90 overflow-hidden",
          premium ? "h-2.5" : "h-1.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700", bar)}
          style={{ width: `${Math.min(100, live)}%` }}
        />
      </div>
      {!ready && hrs != null && premium && (
        <p className="text-[10px] text-zinc-500">
          {row.label} voraussichtlich vollständig regeneriert in {hrs} h
        </p>
      )}
    </div>
  );
}

export const MuscleRecoveryPanel = memo(function MuscleRecoveryPanel({
  muscles,
  compact = false,
  showLink = false,
  title = "Muskelregeneration",
  variant = "default",
}: Props) {
  const isSection = variant === "section";
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const liveMuscles = useMemo(
    () =>
      muscles.map((m) => ({
        ...m,
        live: liveRecoveryPercent(
          m.lastTrainedAt,
          m.hoursToFull ?? m.recoveryHoursRequired,
          m.recoveryPercent,
          m.computedAt
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick triggers live % refresh
    [muscles, tick]
  );

  if (liveMuscles.length === 0) {
    return (
      <div
        className={cn(
          isSection
            ? "rounded-3xl border border-zinc-700/50 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 mt-2"
            : "rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4"
        )}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-300 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-cyan-400" />
          {title}
        </p>
        <p className="text-xs text-zinc-500 mt-2">
          Nach dem ersten Workout siehst du hier die Regeneration deiner
          Muskelgruppen.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        isSection
          ? "rounded-3xl border border-zinc-700/50 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-5 mt-2"
          : "rounded-2xl border border-zinc-800 bg-zinc-900/60",
        !isSection && (compact ? "p-3" : "p-4")
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <p
          className={cn(
            "font-semibold uppercase tracking-wide flex items-center gap-1.5",
            isSection ? "text-sm text-zinc-300" : "text-xs text-zinc-400"
          )}
        >
          <Activity
            className={cn("text-cyan-400", isSection ? "h-4 w-4" : "h-3.5 w-3.5")}
          />
          {title}
        </p>
        {showLink && (
          <Link href="/workouts/journey" className="text-[10px] text-cyan-400">
            Details
          </Link>
        )}
      </div>
      <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
        Dynamisch aus deinen abgeschlossenen Sätzen (Muskelgruppen, Volumen,
        Intensität) — stärkere Belastung = längere Erholung.
      </p>
      <div
        className={cn(
          "space-y-3",
          compact && !isSection && "space-y-2.5",
          isSection && "space-y-3.5"
        )}
      >
        {liveMuscles.map((row) => (
          <RecoveryRow
            key={row.muscle}
            row={row}
            live={row.live}
            premium={isSection}
          />
        ))}
      </div>
    </div>
  );
});
