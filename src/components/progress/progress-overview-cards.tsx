"use client";

import { memo } from "react";
import Link from "next/link";
import { Scale, Target } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

type Props = {
  currentKg: number | null;
  targetKg: number | null;
  trainingSessions?: number;
  weekChangeKg?: number | null;
};

/** Top overview — current weight and goal only. Charts follow. */
export const ProgressOverviewCards = memo(function ProgressOverviewCards({
  currentKg,
  targetKg,
  weekChangeKg = null,
}: Props) {
  const cards = [
    {
      key: "w",
      label: "Aktuelles Gewicht",
      value:
        currentKg != null
          ? `${currentKg.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg`
          : "—",
      sub:
        weekChangeKg != null
          ? `${weekChangeKg > 0 ? "+" : ""}${weekChangeKg.toFixed(1)} kg · 7 Tage`
          : "Eintragen",
      icon: Scale,
      tint: "text-emerald-400",
      href: "/progress?log=1",
    },
    {
      key: "g",
      label: "Zielgewicht",
      value:
        targetKg != null
          ? `${targetKg.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg`
          : "—",
      sub:
        currentKg != null && targetKg != null
          ? `${(currentKg - targetKg).toLocaleString("de-DE", {
              maximumFractionDigits: 1,
              signDisplay: "exceptZero",
            })} kg Differenz`
          : "In Einstellungen",
      icon: Target,
      tint: "text-accent",
      href: "/settings#settings-ziele",
    },
  ] as const;

  return (
    <PremiumCard padding="sm" className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.key}
              href={c.href}
              prefetch
              className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 min-h-11 active:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.03] dark:active:bg-white/[0.06]"
            >
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-500">
                <Icon className={`h-3.5 w-3.5 ${c.tint}`} aria-hidden />
                {c.label}
              </div>
              <p className="text-xl font-bold text-zinc-900 dark:text-white tabular-nums mt-1.5 leading-tight">
                {c.value}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{c.sub}</p>
            </Link>
          );
        })}
      </div>
    </PremiumCard>
  );
});
