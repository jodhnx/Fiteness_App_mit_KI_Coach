"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Dumbbell,
  Plus,
  Camera,
  Watch,
  MessageCircle,
  Users,
} from "lucide-react";
import { hapticTap } from "@/lib/haptic";

const ACTIONS = [
  { href: "/workouts/quick", label: "Training", icon: Dumbbell },
  { href: "/nutrition?add=LUNCH", label: "Essen", icon: Plus },
  { href: "/progress#photos", label: "Foto", icon: Camera },
  { href: "/geraete", label: "Geräte", icon: Watch },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/social", label: "Social", icon: Users },
] as const;

/** Compact quick-access rail for frequent actions. */
export const QuickAccessRail = memo(function QuickAccessRail() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch
          onClick={() => hapticTap()}
          className="shrink-0 flex flex-col items-center gap-1.5 min-w-[64px] rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 active:scale-95 transition-transform"
        >
          <Icon className="h-5 w-5 text-accent" />
          <span className="text-[10px] font-medium text-zinc-300">{label}</span>
        </Link>
      ))}
    </div>
  );
});
