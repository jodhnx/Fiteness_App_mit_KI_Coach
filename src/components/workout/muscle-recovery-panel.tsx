"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { liveRecoveryPercent } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { Activity } from "lucide-react";

type Props = {
  muscles: MuscleRecovery[];
  compact?: boolean;
  showLink?: boolean;
  title?: string;
  variant?: "default" | "section";
};

function barColor(percent: number) {
  if (percent >= 85) return "bg-emerald-500";
  if (percent >= 50) return "bg-cyan-500";
  return "bg-amber-500";
}

function RecoveryRow({
  row,
  live,
  premium,
}: {
  row: MuscleRecovery;
  live: number;
  premium?: boolean;
}) {
  const filled = Math.round((live / 100) * 10);
  const blocks = "█".repeat(filled) + "░".repeat(10 - filled);

  return (
    <div className={cn("space-y-1.5", premium && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-zinc-300 font-medium shrink-0",
            premium ? "text-sm w-20" : "text-sm w-24"
          )}
        >
          {row.label}
        </span>
        {!premium && (
          <span className="font-mono text-[11px] text-zinc-500 tracking-tight truncate flex-1">
            {blocks}
          </span>
        )}
        <span
          className={cn(
            "tabular-nums font-bold text-right shrink-0",
            premium ? "text-sm w-12" : "text-xs w-10",
            live >= 85 ? "text-emerald-400" : live >= 50 ? "text-cyan-400" : "text-amber-400"
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
          className={cn(
            "h-full rounded-full transition-all duration-700",
            barColor(live),
            premium && live >= 85 && "bg-gradient-to-r from-emerald-600 to-emerald-400",
            premium && live >= 50 && live < 85 && "bg-gradient-to-r from-cyan-600 to-cyan-400",
            premium && live < 50 && "bg-gradient-to-r from-amber-600 to-amber-400"
          )}
          style={{ width: `${live}%` }}
        />
      </div>
    </div>
  );
}

export const MuscleRecoveryPanel = memo(function MuscleRecoveryPanel({
  muscles,
  compact = false,
  showLink = false,
  title = "Muskel-Regeneration",
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
        live: liveRecoveryPercent(m.lastTrainedAt, m.recoveryHoursRequired),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick triggers live % refresh
    [muscles, tick]
  );

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
          <Activity className={cn("text-cyan-400", isSection ? "h-4 w-4" : "h-3.5 w-3.5")} />
          {title}
        </p>
        {showLink && (
          <Link href="/workouts/journey" className="text-[10px] text-cyan-400">
            Details
          </Link>
        )}
      </div>
      <div className={cn("space-y-3", compact && !isSection && "space-y-2.5", isSection && "space-y-3.5")}>
        {liveMuscles.map((row) => (
          <RecoveryRow key={row.muscle} row={row} live={row.live} premium={isSection} />
        ))}
      </div>
    </div>
  );
});
