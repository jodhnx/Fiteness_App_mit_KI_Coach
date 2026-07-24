"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { PremiumCard } from "@/components/ui/premium-card";
import { Sparkles, ChevronRight } from "lucide-react";

type Insight = {
  type: string;
  message: string;
  priority: string;
  actionHref?: string;
};

/** Coach 2.0 daily insights + weekly summary panel. */
export const CoachInsightsPanel = memo(function CoachInsightsPanel() {
  const [summary, setSummary] = useState("");
  const [tips, setTips] = useState<Insight[]>([]);
  const [weekly, setWeekly] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/coach/insights")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary ?? "");
        setTips(d.tips ?? []);
        if (d.weeklyReportText) setWeekly(d.weeklyReportText);
      })
      .catch(() => {});
  }, []);

  if (!summary && tips.length === 0) return null;

  return (
    <div className="space-y-3">
      <PremiumCard glow className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-white">Heute für dich</h2>
        </div>
        {summary && <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>}
        <ul className="space-y-2 mt-2">
          {tips.slice(0, 5).map((t, i) => (
            <li key={`${t.type}-${i}`}>
              {t.actionHref ? (
                <Link
                  href={t.actionHref}
                  className="flex items-start gap-2 text-xs text-zinc-300 hover:text-white"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <span>{t.message}</span>
                </Link>
              ) : (
                <p className="text-xs text-zinc-400 pl-5">{t.message}</p>
              )}
            </li>
          ))}
        </ul>
      </PremiumCard>

      {weekly && (
        <PremiumCard className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
            Wochenbericht
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed">{weekly}</p>
        </PremiumCard>
      )}
    </div>
  );
});
