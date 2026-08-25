"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DailyActionPlan } from "@/lib/intelligence/daily-plan/types";

export function HomeDailyActionPlanCard({
  plan,
}: {
  plan: DailyActionPlan | null | undefined;
}) {
  if (!plan?.primary) return null;

  const { primary, secondary, status } = plan;
  const onTrack = status === "on_track";

  return (
    <div
      className={
        onTrack
          ? "rounded-xl border border-emerald-500/15 bg-emerald-950/15 px-3 py-2.5"
          : "rounded-xl border border-cyan-500/15 bg-cyan-950/20 px-3 py-2.5"
      }
      aria-live="polite"
      aria-label="Tagesplan"
    >
      <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Heute</p>
      <p className="text-sm font-semibold text-zinc-100 leading-snug">
        {primary.title}: {primary.explanation}
      </p>
      {primary.requiresConfirmation && (
        <p className="text-[11px] text-amber-400/90 mt-1">Nur Vorschlag — du entscheidest.</p>
      )}
      {primary.action && (
        <Link
          href={primary.action.href}
          className="mt-2 inline-flex min-h-11 items-center text-xs font-medium text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 rounded-md px-1 -mx-1"
        >
          {primary.action.label}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
      {secondary.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
          {secondary.map((s) => (
            <li key={s.id} className="text-xs text-zinc-400 leading-relaxed">
              {s.title}: {s.explanation}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
