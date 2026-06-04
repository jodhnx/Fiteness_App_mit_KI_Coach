"use client";

import Link from "next/link";
import { Scale, ChevronRight } from "lucide-react";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeBodyCard({
  body,
}: {
  body: NonNullable<HomeDataPayload["bodyTransformation"]>;
}) {
  return (
    <Link
      href="/progress"
      prefetch
      className="block rounded-2xl border border-violet-500/20 bg-violet-950/20 p-4 active:opacity-95 transition-opacity"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Scale className="h-4 w-4 text-violet-400" />
          Body Transformation
        </h2>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-[10px] text-zinc-500">Start</p>
          <p className="text-lg font-bold text-white tabular-nums">{body.startKg} kg</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Aktuell</p>
          <p className="text-lg font-bold text-accent tabular-nums">{body.currentKg} kg</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Ziel</p>
          <p className="text-lg font-bold text-white tabular-nums">
            {body.targetKg != null ? `${body.targetKg}` : "—"}
            {body.targetKg != null && (
              <span className="text-xs font-normal text-zinc-500"> kg</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Fortschritt</span>
        <span className="font-semibold text-white tabular-nums">{body.progressPercent}%</span>
      </div>
      <MacroProgressBar consumed={body.progressPercent} target={100} className="h-2" />
    </Link>
  );
}
