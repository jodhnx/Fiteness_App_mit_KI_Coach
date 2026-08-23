"use client";

import { memo } from "react";
import Link from "next/link";
import { Dumbbell, Plus, Scale, Activity } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

/** V7 primary quick actions — Essen, Training, Gewicht, Cardio */
const ACTIONS = [
  { href: "/nutrition?add=LUNCH", label: "Essen", icon: Plus },
  { href: "/workouts/quick", label: "Training", icon: Dumbbell },
  { href: "/progress?log=1", label: "Gewicht", icon: Scale },
  { href: "/workouts/cardio", label: "Cardio", icon: Activity },
] as const;

/** Compact quick-access rail — primary actions first. */
export const QuickAccessRail = memo(function QuickAccessRail() {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          onClick={() => hapticTap()}
          className="flex min-w-[68px] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-3 py-2.5 transition-transform active:scale-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12">
            <Icon className="h-4 w-4 text-accent" />
          </span>
          <span className="text-[10px] font-semibold text-zinc-300">{label}</span>
        </Link>
      ))}
    </div>
  );
});
