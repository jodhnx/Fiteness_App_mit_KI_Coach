"use client";

import { memo } from "react";

function greetingPart(): string {  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Tag";
  return "Abend";
}

/** Name + streak — no date-range clutter next to the flame. */
export const HomeGreeting = memo(function HomeGreeting({
  name,
  streakDays = 0,
}: {
  name?: string | null;
  streakDays?: number;
  /** @deprecated unused — kept for call-site compatibility */
  cue?: string | null;
}) {
  const part = greetingPart();
  const first = name?.trim()?.split(/\s+/)[0];

  return (
    <div className="pb-0.5 pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Guten {part}
      </p>
      <h1 className="mt-1 truncate text-[1.65rem] font-bold leading-[1.15] tracking-tight text-zinc-900 dark:text-white">
        {first ? first : "Willkommen zurück"}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[13px] font-semibold tabular-nums text-amber-600 dark:text-amber-400/95">
          🔥 {streakDays} {streakDays === 1 ? "Tag" : "Tage"}
        </p>
        {streakDays >= 2 ? (
          <p className="text-[13px] font-medium text-zinc-500">Stark! Weiter so!</p>
        ) : null}
      </div>
    </div>
  );
});
