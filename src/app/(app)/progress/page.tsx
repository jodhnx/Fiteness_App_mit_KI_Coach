"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { invalidateCache, getCached } from "@/lib/client-cache";
import { NUTRITION_DASHBOARD_EVENT } from "@/lib/nutrition-sync";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { isValidDashboardPayload } from "@/lib/nutrition-defaults";
import { buildWeightAnalytics, type WeightPeriod } from "@/lib/weight-analytics";
import { WeightInput } from "@/components/progress/weight-input";
import { toast } from "sonner";
import { format } from "date-fns";
import Image from "next/image";
import { BodyTransformationCard } from "@/components/progress/body-transformation-card";
import type { BodyTransformation } from "@/lib/body-transformation";
import { TrainingHistorySection } from "@/components/progress/training-history-section";
import { ProgressStatsSection } from "@/components/progress/progress-stats-section";
import { ProgressChartsSection } from "@/components/progress/progress-charts-section";
import { Input } from "@/components/ui/input";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
import { hasScreenLoaded } from "@/lib/storage-service";

type ProgressPayload = {
  entries: { id: string; date: string; weightKg?: number; waistCm?: number }[];
  photos: {
    id: string;
    imageUrl: string;
    aiAnalysis?: string;
    aiProgress?: string;
    takenAt?: string;
  }[];
  profile?: {
    weightKg: number | null;
    targetWeightKg: number | null;
    targetWeightDate: string | null;
  };
  startWeightKg?: number | null;
  transformation?: BodyTransformation | null;
  dashboard?: {
    nutritionTrend: { date: string; label: string; calories: number; proteinG: number }[];
    calorieTarget: number;
    proteinTargetG: number;
    trainingVolumeTrend: { date: string; label: string; value: number }[];
    trainingFrequencyTrend: { date: string; label: string; value: number }[];
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
  } | null;
};

/** ProgressScreen — Body → Gewicht → Charts → Historie → Statistiken */
export default function ProgressPage() {
  const searchParams = useSearchParams();
  const logRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<WeightPeriod>("30d");

  const hadCache = useMemo(
    () => getCached<ProgressPayload>(PROGRESS_CACHE_KEY) != null || hasScreenLoaded("progress"),
    []
  );

  const { data: progressData, loading, reload } = useCachedFetch<ProgressPayload>(
    PROGRESS_CACHE_KEY,
    "/api/progress",
    180_000,
    6_000,
    { revalidateOnMount: !hadCache, staleRatio: 0.85 }
  );

  const [nutritionRev, setNutritionRev] = useState(0);

  useEffect(() => {
    const onNutrition = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (!detail || !isValidDashboardPayload(detail)) return;
      setNutritionRev((v) => v + 1);
    };
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
    return () => window.removeEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
  }, []);

  const displayData = useMemo(() => {
    return progressData ?? getCached<ProgressPayload>(PROGRESS_CACHE_KEY);
  }, [progressData, nutritionRev]);

  const entries = useMemo(
    () => displayData?.entries ?? [],
    [displayData?.entries]
  );
  const photos = useMemo(() => displayData?.photos ?? [], [displayData?.photos]);
  const profile = displayData?.profile ?? null;
  const startWeightKg = displayData?.startWeightKg ?? null;
  const dashboard = displayData?.dashboard ?? null;
  const transformation = displayData?.transformation ?? null;

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
    if (displayData) {
      import("@/lib/storage-service").then(({ markScreenLoaded }) => markScreenLoaded("progress"));
      void prefetchProgressCharts();
    }
  }, [displayData]);

  useEffect(() => {
    if (searchParams.get("log") === "1" && logRef.current) {
      logRef.current.scrollIntoView({ block: "start" });
    }
  }, [searchParams]);

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

  const showSkeleton = loading && !displayData && !hadCache;
  const lastWeight = analytics.currentKg ?? profile?.weightKg;

  return (
    <PageShell
      title="Fortschritt"
      subtitle="Transformation · Gewicht · Historie · Statistiken"
      maxWidth="2xl"
      className="space-y-5 pb-28"
      bottomNav={false}
    >

      {showSkeleton && (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-zinc-900 rounded-2xl border border-zinc-800" />
          <div className="h-36 bg-zinc-900 rounded-2xl border border-zinc-800" />
        </div>
      )}

      {!showSkeleton && (
      <>

      {/* OBERER BEREICH */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white">📸 Body Transformation</h2>
        {transformation && <BodyTransformationCard data={transformation} />}

        <div className="card-premium p-4">
          <Input type="file" accept="image/*" onChange={uploadPhoto} className="text-sm mb-3" />
          {photos.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Vorher/Nachher-Fotos.</p>
          ) : (
            <>
              {photos.length >= 2 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl overflow-hidden border border-zinc-700">
                    <p className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-900">Vorher</p>
                    <Image
                      src={photos[photos.length - 1]!.imageUrl}
                      alt="Vorher"
                      width={200}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                    {photos[photos.length - 1]?.takenAt && (
                      <p className="text-[10px] text-zinc-600 px-2 py-1">
                        {format(new Date(photos[photos.length - 1]!.takenAt!), "dd.MM.yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl overflow-hidden border border-cyan-500/30">
                    <p className="text-[10px] text-cyan-400 px-2 py-1 bg-zinc-900">Nachher</p>
                    <Image
                      src={photos[0]!.imageUrl}
                      alt="Nachher"
                      width={200}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                    {photos[0]?.takenAt && (
                      <p className="text-[10px] text-zinc-600 px-2 py-1">
                        {format(new Date(photos[0]!.takenAt!), "dd.MM.yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {photos.map((p) => (
                  <div key={p.id} className="flex gap-3 items-center rounded-lg bg-zinc-900/60 p-2">
                    <Image
                      src={p.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400">
                        {p.takenAt ? format(new Date(p.takenAt), "dd.MM.yyyy") : "—"}
                      </p>
                      {p.aiProgress && (
                        <p className="text-[11px] text-zinc-300 truncate">{p.aiProgress}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div ref={logRef} className="card-premium p-4 scroll-mt-4">
          <h2 className="text-sm font-semibold text-white mb-1">⚖️ Gewicht eintragen</h2>
          {lastWeight != null && (
            <p className="text-2xl font-bold text-cyan-400 tabular-nums mb-3">
              {lastWeight.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg
              <span className="text-xs font-normal text-zinc-500 ml-2">zuletzt</span>
            </p>
          )}
          <WeightInput initialKg={lastWeight} onSave={saveWeight} />
        </div>

        {dashboard && (
          <ProgressChartsSection
            nutritionTrend={dashboard.nutritionTrend}
            calorieTarget={dashboard.calorieTarget}
            proteinTargetG={dashboard.proteinTargetG}
            weightChartPoints={analytics.chartPoints}
            weightPeriod={period}
            onWeightPeriodChange={setPeriod}
            trainingVolumeTrend={dashboard.trainingVolumeTrend ?? []}
            trainingFrequencyTrend={dashboard.trainingFrequencyTrend ?? []}
          />
        )}
      </section>

      {/* UNTERER BEREICH */}
      <section className="space-y-4">
        {dashboard && (
          <>
            <TrainingHistorySection sessions={dashboard.trainingHistory} />
            <ProgressStatsSection
              trainingHistory={dashboard.trainingHistory}
              streaks={dashboard.streaks}
              personalRecords={dashboard.personalRecords}
            />
          </>
        )}
      </section>
      </>
      )}
    </PageShell>
  );
}
