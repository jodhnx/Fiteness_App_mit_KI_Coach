"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Footprints,
  Moon,
  Sparkles,
  Utensils,
} from "lucide-react";
import { getCached, setCached } from "@/lib/client-cache";
import type { CoachInsightsResult } from "@/lib/coach-insights";
import { cn } from "@/lib/utils";

const CACHE_KEY = "coach-insights";

function formatSleep(h: number | null | undefined) {
  if (h == null || !Number.isFinite(h)) return null;
  const hours = Math.floor(h);
  const mins = Math.round((h - hours) * 60);
  return `${hours} h ${String(mins).padStart(2, "0")} min`;
}

/** Status dashboard + recommendations for the KI Coach hub. */
export const CoachStatusDashboard = memo(function CoachStatusDashboard({
  onAsk,
}: {
  onAsk?: (prompt: string) => void;
}) {
  const [data, setData] = useState<CoachInsightsResult | null>(
    () => getCached<CoachInsightsResult>(CACHE_KEY, { allowStale: true })
  );

  useEffect(() => {
    void fetch("/api/coach/insights", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setCached(CACHE_KEY, d, 90_000);
        setData(d as CoachInsightsResult);
      })
      .catch(() => undefined);
  }, []);

  const status = data?.status;
  const recommendations =
    data?.recommendations?.length
      ? data.recommendations
      : (data?.tips ?? []).slice(0, 4).map((t) => t.message);

  const rows = [
    {
      key: "training",
      label: "Training",
      value: status?.trainingLabel ?? "—",
      ok: status?.trainingDoneToday,
      icon: Activity,
      href: "/workouts",
    },
    {
      key: "kcal",
      label: "Ernährung",
      value: status?.calories
        ? `${status.calories.consumed.toLocaleString("de-DE")} / ${status.calories.target.toLocaleString("de-DE")} kcal`
        : "Nicht verfügbar",
      icon: Utensils,
      href: "/nutrition",
    },
    {
      key: "protein",
      label: "Protein",
      value: status?.protein
        ? `${status.protein.consumed} / ${status.protein.target} g`
        : "Nicht verfügbar",
      icon: Utensils,
      href: "/nutrition",
    },
    {
      key: "steps",
      label: "Schritte",
      value:
        status?.steps != null
          ? status.steps.toLocaleString("de-DE")
          : "Nicht verfügbar",
      icon: Footprints,
      href: "/geraete",
    },
    {
      key: "sleep",
      label: "Schlaf",
      value: formatSleep(status?.sleepHours) ?? "Nicht verfügbar",
      icon: Moon,
      href: "/geraete",
    },
    {
      key: "recovery",
      label: "Regeneration",
      value:
        status?.recoveryPct != null
          ? `${status.recoveryPct} %`
          : "Nicht verfügbar",
      icon: CheckCircle2,
      href: "/workouts",
    },
  ] as const;

  return (
    <div className="space-y-3">
      <section className="rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Dein heutiger Status
            </p>
            {status?.goal && (
              <p className="text-xs text-zinc-400 mt-0.5">
                Ziel: <span className="text-zinc-200">{status.goal}</span>
              </p>
            )}
          </div>
          <Sparkles className="h-4 w-4 text-accent shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {rows.map(({ key, label, value, icon: Icon, href, ...rest }) => {
            const ok = "ok" in rest ? rest.ok : undefined;
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 min-h-[64px]",
                  "active:scale-[0.98] transition-transform"
                )}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  <Icon className="h-3 w-3" />
                  {label}
                </div>
                <p
                  className={cn(
                    "mt-1 text-[13px] font-semibold leading-snug tabular-nums",
                    ok === true
                      ? "text-emerald-400"
                      : value === "Nicht verfügbar"
                        ? "text-zinc-500"
                        : "text-white"
                  )}
                >
                  {value}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {recommendations.length > 0 && (
        <section className="rounded-[1.5rem] border border-white/[0.08] bg-zinc-900/80 px-4 py-3.5 space-y-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Meine Empfehlung
          </h2>
          <ul className="space-y-2">
            {recommendations.slice(0, 5).map((msg, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() =>
                    onAsk?.(
                      `Erkläre und vertiefe diese Empfehlung konkret für mich: ${msg}`
                    )
                  }
                  className="flex w-full items-start gap-2 text-left text-sm text-zinc-300 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="leading-snug">{msg}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data?.weeklyReportText && (
        <section className="rounded-[1.5rem] border border-white/[0.06] bg-zinc-900/60 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Deine Woche
          </p>
          <p className="mt-1.5 text-sm text-zinc-300 leading-relaxed">
            {data.weeklyReportText}
          </p>
          {onAsk && (
            <button
              type="button"
              onClick={() =>
                onAsk(
                  "Analysiere meine Woche detailliert: Gewicht, Kalorien, Protein, Training, Schritte, Schlaf, Regeneration. Gib 3–5 konkrete Empfehlungen."
                )
              }
              className="mt-2 text-xs font-semibold text-accent"
            >
              Woche analysieren →
            </button>
          )}
        </section>
      )}
    </div>
  );
});
