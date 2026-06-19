"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { HomeCoach } from "@/lib/home-defaults";

export function HomeKiTipCard({ coach }: { coach: HomeCoach }) {
  const tip = coach.tips[0]?.message ?? coach.summary;
  if (!tip) return null;

  return (
    <Link
      href="/coach"
      prefetch
      className="block rounded-2xl border border-violet-500/20 bg-violet-950/25 p-4 active:opacity-95"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-300 flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        KI Coach Empfehlung
      </p>
      <p className="text-sm text-zinc-200 leading-relaxed line-clamp-3">{tip}</p>
    </Link>
  );
}
