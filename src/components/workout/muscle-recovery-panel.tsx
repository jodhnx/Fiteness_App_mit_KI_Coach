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

function statusMeta(percent: number) {
  if (percent >= 85) {
    return {
      emoji: "🟢",
      label: "Erholt",
      bar: "bg-emerald-500",
      text: "text-emerald-400",
    };
  }
  if (percent >= 50) {
    return {
      emoji: "🟡",
      label: "Teilweise erholt",
      bar: "bg-amber-400",
      text: "text-amber-400",
    };
  }
  return {
    emoji: "🔴",
    label: "Noch nicht vollständig erholt",
    bar: "bg-red-500",
    text: "text-red-400",
  };
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
  const meta = statusMeta(live);

  return (
    <div className={cn("space-y-1.5", premium && "space-y-2")}>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-zinc-300 font-medium shrink-0 flex items-center gap-1.5",
            premium ? "text-sm min-w-[5.5rem]" : "text-sm min-w-[5rem]"
          )}
        >
          <span aria-hidden>{meta.emoji}</span>
          {row.label}
        </span>
        <span className={cn("text-[10px] truncate flex-1", meta.text)}>{meta.label}</span>
        <span
          className={cn(
            "tabular-nums font-bold text-right shrink-0",
            premium ? "text-sm w-12" : "text-xs w-10",
            meta.text
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
          className={cn("h-full rounded-full transition-all duration-700", meta.bar)}
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
      <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">
        Basierend auf deinen abgeschlossenen Workouts (Muskelgruppen, Sätze, Volumen,
        Intensität).
      </p>
      <div
        className={cn(
          "space-y-3",
          compact && !isSection && "space-y-2.5",
          isSection && "space-y-3.5"
        )}
      >
        {liveMuscles.map((row) => (
          <RecoveryRow key={row.muscle} row={row} live={row.live} premium={isSection} />
        ))}
      </div>
    </div>
  );
});
