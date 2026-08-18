"use client";

import { memo } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

function greetingPart(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Tag";
  return "Abend";
}

/** Name + streak only — profile avatar lives in the global header. */
export const HomeGreeting = memo(function HomeGreeting({
  name,
  streakDays = 0,
}: {
  name?: string | null;
  streakDays?: number;
}) {
  const part = greetingPart();
  const first = name?.trim()?.split(/\s+/)[0];

  return (
    <div className="pb-2 pt-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Guten {part}
      </p>
      <h1 className="mt-0.5 text-[1.55rem] font-bold leading-tight tracking-tight text-white truncate">
        {first ? <span className="text-accent">{first}</span> : "Willkommen zurück"}
      </h1>
      {streakDays > 0 && (
        <p
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90",
            "tabular-nums"
          )}
        >
          <Flame className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
          {streakDays} {streakDays === 1 ? "Tag" : "Tage"} Streak
        </p>
      )}
    </div>
  );
});
