"use client";

import { memo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { DayFocusItem } from "@/lib/home-smart-layout";
import { cn } from "@/lib/utils";

export const HomeDayFocusCard = memo(function HomeDayFocusCard({
  items,
}: {
  items: DayFocusItem[];
}) {
  if (!items.length) return null;

  return (
    <Link
      href="/coach"
      prefetch
      className={cn(
        "block rounded-[1.25rem] border border-violet-500/25 p-4",
        "bg-gradient-to-br from-violet-950/35 via-zinc-950/80 to-zinc-950",
        "shadow-[0_0_28px_-10px_rgba(139,92,246,0.35)] active:opacity-95 transition-opacity"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-300/90 flex items-center gap-1.5 mb-3">
        <Sparkles className="h-3.5 w-3.5" />
        Dein Tagesfokus
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex gap-2.5 items-start">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                item.priority === "high"
                  ? "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]"
                  : item.priority === "medium"
                    ? "bg-violet-400"
                    : "bg-zinc-600"
              )}
            />
            <p className="text-sm text-zinc-200 leading-snug">{item.message}</p>
          </li>
        ))}
      </ul>
    </Link>
  );
});
