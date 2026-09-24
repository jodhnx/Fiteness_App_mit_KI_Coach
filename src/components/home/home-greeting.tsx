"use client";

import { memo } from "react";
import { UserAvatar } from "@/components/user/user-avatar";

function greetingPart(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Tag";
  return "Abend";
}

/** Compact greeting + avatar — matches premium home header. */
export const HomeGreeting = memo(function HomeGreeting({
  name,
  image,
  streakDays = 0,
}: {
  name?: string | null;
  image?: string | null;
  streakDays?: number;
  /** @deprecated unused — kept for call-site compatibility */
  cue?: string | null;
}) {
  const part = greetingPart();
  const first = name?.trim()?.split(/\s+/)[0];

  return (
    <div className="flex items-start justify-between gap-3 pb-0.5 pt-0">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Guten {part}
        </p>
        <h1 className="mt-1 truncate text-[1.55rem] font-bold leading-[1.15] tracking-tight text-zinc-900 dark:text-white">
          {first ? first : "Willkommen zurück"}
        </h1>
        {streakDays > 0 ? (
          <p className="mt-1.5 text-[12px] font-semibold tabular-nums text-amber-600 dark:text-amber-400/95">
            🔥 {streakDays} {streakDays === 1 ? "Tag" : "Tage"}
            {streakDays >= 2 ? (
              <span className="ml-2 font-medium text-zinc-500">Stark!</span>
            ) : null}
          </p>
        ) : null}
      </div>
      <UserAvatar
        src={image}
        name={name}
        size="sm"
        className="!h-11 !w-11 text-sm shrink-0 mt-0.5"
      />
    </div>
  );
});
