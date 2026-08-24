"use client";

import { memo } from "react";
import { Flame } from "lucide-react";

function greetingPart(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Tag";
  return "Abend";
}

/** Name + one-line cue so the next action is obvious within seconds. */
export const HomeGreeting = memo(function HomeGreeting({
  name,
  streakDays = 0,
  cue,
}: {
  name?: string | null;
  streakDays?: number;
  cue?: string | null;
}) {
  const part = greetingPart();
  const first = name?.trim()?.split(/\s+/)[0];

  return (
    <div className="pb-0 pt-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        Guten {part}
      </p>
      <h1 className="mt-0.5 truncate text-[1.55rem] font-bold leading-tight tracking-tight text-white">
        {first ? <span className="text-accent">{first}</span> : "Willkommen zurück"}
      </h1>
      {cue ? (
        <p className="mt-1 text-[13px] font-medium leading-snug text-zinc-300">{cue}</p>
      ) : (
        <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium tabular-nums text-amber-400/90">
          <Flame className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
          {streakDays} {streakDays === 1 ? "Tag" : "Tage"} Streak
        </p>
      )}
    </div>
  );
});
