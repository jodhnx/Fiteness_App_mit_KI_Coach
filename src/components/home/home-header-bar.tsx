"use client";

import { memo } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/user/user-avatar";
import { Flame, Sparkles } from "lucide-react";

function greetingPart(): string {
  const h = new Date().getHours();
  return h < 12 ? "Morgen" : h < 18 ? "Tag" : "Abend";
}

export const HomeHeaderBar = memo(function HomeHeaderBar({
  name,
  image,
  streakDays,
  level,
  levelName,
}: {
  name?: string | null;
  image?: string | null;
  streakDays: number;
  level?: number;
  levelName?: string;
}) {
  const first = name?.trim().split(/\s+/)[0];

  return (
    <div className="flex items-center gap-3 pb-1">
      <Link href="/settings" prefetch className="shrink-0">
        <UserAvatar src={image} name={name} size="lg" />
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-400">Guten {greetingPart()}</p>
        <h1 className="text-xl font-bold text-white truncate">
          {first ?? "Willkommen"}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-xs">
          {streakDays > 0 && (
            <span className="inline-flex items-center gap-1 text-orange-400 font-medium">
              <Flame className="h-3.5 w-3.5" />
              {streakDays} Tage
            </span>
          )}
          {level != null && level > 0 && (
            <span className="inline-flex items-center gap-1 text-violet-400 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Level {level}
              {levelName ? ` · ${levelName}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
