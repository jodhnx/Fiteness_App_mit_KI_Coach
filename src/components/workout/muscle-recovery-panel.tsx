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
};

function barColor(percent: number) {
  if (percent >= 85) return "bg-emerald-500";
  if (percent >= 50) return "bg-cyan-500";
  return "bg-amber-500";
}

function RecoveryRow({ row, live }: { row: MuscleRecovery; live: number }) {
  const filled = Math.round((live / 100) * 10);
  const blocks = "█".repeat(filled) + "░".repeat(10 - filled);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-zinc-300 font-medium w-24 shrink-0">{row.label}</span>
        <span className="font-mono text-[11px] text-zinc-500 tracking-tight truncate flex-1">
          {blocks}
        </span>
        <span
          className={cn(
            "tabular-nums font-bold text-xs w-10 text-right",
            live >= 85 ? "text-emerald-400" : live >= 50 ? "text-cyan-400" : "text-amber-400"
          )}
        >
          {live}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barColor(live))}
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
}: Props) {
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
    [muscles, tick]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/60",
        compact ? "p-3" : "p-4"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-400" />
          {title}
        </p>
        {showLink && (
          <Link href="/workouts/journey" className="text-[10px] text-cyan-400">
            Details
          </Link>
        )}
      </div>
      <div className={cn("space-y-3", compact && "space-y-2.5")}>
        {liveMuscles.map((row) => (
          <RecoveryRow key={row.muscle} row={row} live={row.live} />
        ))}
      </div>
    </div>
  );
});
