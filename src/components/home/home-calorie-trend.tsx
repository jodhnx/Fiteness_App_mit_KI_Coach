"use client";

import Link from "next/link";
import { Flame, ChevronRight } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeCalorieTrend({ home }: { home: HomeDataPayload }) {
  const eaten = Math.round(home.caloriesIntake);
  const target = Math.round(home.calorieTarget);
  const remaining = Math.max(0, Math.round(home.caloriesRemaining));
  const weekly = home.weeklyReport?.avgCaloriesKcal;

  const pct = target > 0 ? Math.min(100, Math.round((eaten / target) * 100)) : 0;

  return (
    <Link
      href="/nutrition"
      prefetch
      className="block rounded-2xl border border-orange-500/20 bg-orange-950/15 p-4 active:opacity-95"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          Kalorien-Trend
        </h2>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </div>
      <div className="flex items-end gap-1 h-16 mb-2">
        {[0.4, 0.65, 0.5, 0.85, 0.7, 0.9, pct / 100].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-orange-600/80 to-orange-400/60"
            style={{ height: `${Math.max(12, h * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-zinc-400">
        <span>
          Heute: <span className="text-white font-semibold tabular-nums">{eaten}</span> / {target} kcal
        </span>
        <span className="text-orange-300 tabular-nums">{remaining} übrig</span>
      </div>
      {weekly != null && weekly > 0 && (
        <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">Ø Woche: {Math.round(weekly)} kcal</p>
      )}
    </Link>
  );
}
