"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { invalidateCache } from "@/lib/client-cache";
import { buildWeightAnalytics, type WeightPeriod } from "@/lib/weight-analytics";
import { WeightQuickEntry } from "@/components/progress/weight-quick-entry";
import { WeightTrendChart } from "@/components/progress/weight-trend-chart";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";
import { BodyTransformationCard } from "@/components/progress/body-transformation-card";
import { WeeklyReportCard } from "@/components/progress/weekly-report-card";
import type { BodyTransformation } from "@/lib/body-transformation";
import type { WeeklyReport } from "@/lib/weekly-report";
import { Sparkles, Camera } from "lucide-react";
import { ProgressDashboardSections } from "@/components/progress/progress-dashboard-sections";
import { getCached } from "@/lib/client-cache";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ProgressInsights = {
  summaryLines: string[];
  weightChangeMonthKg: number | null;
  workoutsThisMonth: number;
  workoutsLastMonth: number;
};

type ProgressPayload = {
  entries: { id: string; date: string; weightKg?: number; waistCm?: number }[];
  photos: {
    id: string;
    imageUrl: string;
    aiAnalysis?: string;
    aiProgress?: string;
    takenAt?: string;
  }[];
  insights?: ProgressInsights;
  profile?: {
    weightKg: number | null;
    targetWeightKg: number | null;
    targetWeightDate: string | null;
  };
  startWeightKg?: number | null;
  transformation?: BodyTransformation | null;
  weeklyReport?: WeeklyReport | null;
  dashboard?: {
    nutritionTrend: { date: string; label: string; calories: number; proteinG: number }[];
    calorieTarget: number;
    proteinTargetG: number;
    trainingHistory: {
      id: string;
      name: string;
      dayName: string | null;
      completedAt: string | null;
      durationMin: number | null;
      caloriesBurned: number | null;
    }[];
    streaks: {
      training: { currentDays: number; longestDays: number } | null;
      active: { currentDays: number; longestDays: number } | null;
    };
    personalRecords: {
      id: string;
      exerciseName: string;
      recordType: string;
      value: number;
      reps: number | null;
      achievedAt: string;
    }[];
    achievements: {
      unlocked: number;
      total: number;
      recent: { name: string; icon: string; tier: string; xpReward: number; earnedAt: string }[];
    };
  } | null;
};

const PERIODS: { id: WeightPeriod; label: string }[] = [
  { id: "today", label: "Heute" },
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "90d", label: "90 Tage" },
  { id: "all", label: "Gesamt" },
];

function formatDelta(kg: number | null) {
  if (kg == null) return "—";
  const sign = kg > 0 ? "+" : "";
  return `${sign}${kg.toLocaleString("de-AT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

export default function ProgressPage() {
  const searchParams = useSearchParams();
  const logRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<WeightPeriod>("30d");

  const { data: progressData, reload } = useCachedFetch<ProgressPayload>(
    PROGRESS_CACHE_KEY,
    "/api/progress",
    120_000,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const cachedProgress = getCached<ProgressPayload>(PROGRESS_CACHE_KEY);
  const displayData = progressData ?? cachedProgress;

  const entries = displayData?.entries ?? [];
  const photos = displayData?.photos ?? [];
  const insights = displayData?.insights;
  const profile = displayData?.profile ?? null;
  const startWeightKg = displayData?.startWeightKg ?? null;
  const dashboard = displayData?.dashboard ?? null;

  const transformation = displayData?.transformation ?? null;
  const weeklyReport = displayData?.weeklyReport ?? null;

  const analytics = useMemo(
    () =>
      buildWeightAnalytics(
        entries,
        period,
        profile
          ? {
              weightKg: profile.weightKg,
              targetWeightKg: profile.targetWeightKg,
              targetWeightDate: profile.targetWeightDate
                ? new Date(profile.targetWeightDate)
                : null,
            }
          : null,
        startWeightKg
      ),
    [entries, period, profile, startWeightKg]
  );

  useEffect(() => {
    if (searchParams.get("log") === "1" && logRef.current) {
      logRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams, progressData]);

  const saveWeight = useCallback(
    async (weightKg: number, waistCm?: number) => {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(new Date(), "yyyy-MM-dd"),
          weightKg,
          waistCm,
        }),
      });
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      toast.success("Gewicht gespeichert");
      invalidateCache(PROGRESS_CACHE_KEY);
      invalidateCache("home-data");
      reload();
    },
    [reload]
  );

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/progress/photos", { method: "POST", body: fd });
    if (!res.ok) {
      toast.error("Upload fehlgeschlagen");
      return;
    }
    toast.success("Fortschrittsbild gespeichert");
    invalidateCache(PROGRESS_CACHE_KEY);
    reload();
  }

  const goal = analytics.goal;

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-28">
      <PageHeader
        title="Fortschritt"
        subtitle="Gewicht · Ernährung · Training · Rekorde · Erfolge"
      />

      {dashboard && (
        <ProgressDashboardSections
          nutritionTrend={dashboard.nutritionTrend}
          calorieTarget={dashboard.calorieTarget}
          proteinTargetG={dashboard.proteinTargetG}
          trainingHistory={dashboard.trainingHistory}
          streaks={dashboard.streaks}
          personalRecords={dashboard.personalRecords}
          achievements={dashboard.achievements}
        />
      )}

      {transformation && <BodyTransformationCard data={transformation} />}

      {weeklyReport && <WeeklyReportCard report={weeklyReport} />}

      <div ref={logRef} className="card-premium p-4 scroll-mt-4">
        <h2 className="text-sm font-semibold text-white mb-3">⚖️ Gewicht eintragen</h2>
        <WeightQuickEntry
          initialKg={analytics.currentKg ?? profile?.weightKg}
          onSave={saveWeight}
        />
      </div>

      <div className="card-premium p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Gewichtsanalyse</h2>
        <div className="grid grid-cols-3 gap-2 text-center mb-4">
          <div className="rounded-lg bg-zinc-900/80 p-2">
            <p className="text-[9px] text-zinc-500 uppercase">Diese Woche</p>
            <p className="text-sm font-bold text-white tabular-nums mt-0.5">
              {formatDelta(analytics.changeWeekKg)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-900/80 p-2">
            <p className="text-[9px] text-zinc-500 uppercase">Letzter Monat</p>
            <p className="text-sm font-bold text-white tabular-nums mt-0.5">
              {formatDelta(analytics.changeMonthKg)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-900/80 p-2">
            <p className="text-[9px] text-zinc-500 uppercase">Ø / Woche</p>
            <p className="text-sm font-bold text-white tabular-nums mt-0.5">
              {formatDelta(analytics.avgChangePerWeekKg)}
            </p>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                period === p.id
                  ? "bg-accent text-zinc-950"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <WeightTrendChart data={analytics.chartPoints} />

        {analytics.weeklyAverages.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-zinc-500 uppercase mb-2">Wochen-Durchschnitt (kg)</p>
            <LazyStatChart data={analytics.weeklyAverages} type="bar" color="#a78bfa" />
          </div>
        )}
      </div>

      {insights && insights.summaryLines.length > 0 && (
        <div className="card-premium p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-violet-300/90 font-semibold uppercase">KI Zusammenfassung</p>
              <ul className="mt-2 space-y-1">
                {insights.summaryLines.map((line) => (
                  <li key={line} className="text-sm text-zinc-300">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="card-premium p-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-accent" />
          Fortschrittsbilder
        </h2>
        <Input type="file" accept="image/*" onChange={uploadPhoto} className="text-sm" />
        {photos.length === 0 ? (
          <p className="text-sm text-zinc-500 mt-3">Noch keine Bilder.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {photos.map((p) => (
              <div key={p.id} className="rounded-xl overflow-hidden border border-zinc-800">
                <Image
                  src={p.imageUrl}
                  alt="Fortschritt"
                  width={300}
                  height={300}
                  className="w-full h-36 object-cover"
                />
                <div className="p-2 text-[11px] text-zinc-400">
                  {p.aiProgress && <p className="text-zinc-300 font-medium">{p.aiProgress}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
