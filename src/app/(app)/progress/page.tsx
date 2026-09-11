"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { getCached, invalidateCache, setCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT, NUTRITION_DASHBOARD_EVENT } from "@/lib/nutrition-sync";
import {
  commitHomeIntelligenceRefresh,
  weightEntriesFromProgressCache,
} from "@/lib/intelligence/client-refresh";
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
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
import { ProgressOverviewCards } from "@/components/progress/progress-overview-cards";
import { BodyMeasurementsCard } from "@/components/progress/body-measurements-card";
import { PageIntro } from "@/components/guide/page-intro";
import { markScreenLoaded } from "@/lib/storage-service";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { ProgressWeeklyIntelligenceCard } from "@/components/progress/progress-weekly-intelligence-card";

const ProgressChartsSection = dynamic(
  () =>
    import("@/components/progress/progress-charts-section").then(
      (m) => m.ProgressChartsSection
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] rounded-xl bg-zinc-200/70 animate-pulse border border-zinc-200 dark:bg-zinc-800/50 dark:border-white/5" />
    ),
  }
);

type ProgressPayload = {
  entries: {
    id: string;
    date: string;
    weightKg?: number;
    waistCm?: number;
    chestCm?: number;
    hipsCm?: number;
    bicepsCm?: number;
    thighsCm?: number;
    bodyFatPct?: number;
  }[];
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

/** Progress — Übersicht → Diagramme → Details */
export default function ProgressPage() {
  const logRef = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<WeightPeriod>("30d");
  const [chartsReady, setChartsReady] = useState(false);
  const [tab, setTab] = useState<"overview" | "weight" | "photos" | "body">(
    "overview"
  );

  useEffect(() => {
    try {
      sessionStorage.setItem("nexform:tab-visited:progress", "1");
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("log") === "1" && logRef.current) {
      logRef.current.scrollIntoView({ block: "start" });
    }
  }, []);

  useEffect(() => {
    const enable = () => setChartsReady(true);
    const idleId =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(enable, { timeout: 1200 })
        : 0;
    const timeoutId = idleId === 0 ? window.setTimeout(enable, 400) : 0;
    return () => {
      if (idleId && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId);
      }
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  // Cache-first: if no cache, fetch immediately; otherwise show stale + revalidate in background
  const hasCachedProgress = getCached(PROGRESS_CACHE_KEY, { allowStale: true }) != null;
  const { data: progressData, loading, reload } = useCachedFetch<ProgressPayload>(
    PROGRESS_CACHE_KEY,
    "/api/progress",
    600_000,
    8_000,
    {
      revalidateOnMount: !hasCachedProgress,
      staleRatio: 0.9,
      cacheOnly: false,
    }
  );

  const [nutritionRev, setNutritionRev] = useState(0);
  const [cacheRev, setCacheRev] = useState(0);

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
    return (
      progressData ??
      getCached<ProgressPayload>(PROGRESS_CACHE_KEY, { allowStale: true })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cacheRev bumps optimistic writes
  }, [progressData, nutritionRev, cacheRev]);

  const entries = useMemo(
    () => displayData?.entries ?? [],
    [displayData?.entries]
  );
  const photos = useMemo(() => displayData?.photos ?? [], [displayData?.photos]);
  const profile = displayData?.profile ?? null;
  const startWeightKg = displayData?.startWeightKg ?? null;
  const dashboard = displayData?.dashboard ?? null;
  const transformation = displayData?.transformation ?? null;

  const readHomeIntelligence = useCallback(() => {
    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
    return {
      weeklyIntelligence: home?.weeklyIntelligence ?? null,
      adaptiveRecommendations: home?.adaptiveRecommendations ?? null,
    };
  }, []);

  const [homeIntel, setHomeIntel] = useState(readHomeIntelligence);

  useEffect(() => {
    const sync = () => setHomeIntel(readHomeIntelligence());
    window.addEventListener(HOME_DATA_EVENT, sync);
    return () => window.removeEventListener(HOME_DATA_EVENT, sync);
  }, [readHomeIntelligence]);

  const { weeklyIntelligence, adaptiveRecommendations } = homeIntel;

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
      markScreenLoaded("progress");
      void prefetchProgressCharts();
    }
  }, [displayData]);

  const saveWeight = useCallback(
    async (weightKg: number, waistCm?: number) => {
      const prev = getCached<ProgressPayload>(PROGRESS_CACHE_KEY, { allowStale: true });
      const today = format(new Date(), "yyyy-MM-dd");

      if (prev) {
        const next: ProgressPayload = {
          ...prev,
          profile: prev.profile
            ? { ...prev.profile, weightKg }
            : { weightKg, targetWeightKg: null, targetWeightDate: null },
          entries: [
            {
              id: `optimistic-${Date.now()}`,
              date: today,
              weightKg,
              waistCm,
            },
            ...prev.entries.filter((e) => e.date !== today),
          ],
        };
        setCached(PROGRESS_CACHE_KEY, next, 600_000);
        setCacheRev((v) => v + 1);
      }

      const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
      const prevHome = home ? { ...home } : null;
      if (home) {
        const weightRows = weightEntriesFromProgressCache();
        const next = commitHomeIntelligenceRefresh(
          { ...home, weightKg },
          { weightEntries: weightRows }
        );
        setCached(HOME_DATA_CACHE_KEY, next, 900_000);
        window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: next }));
      }

      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, weightKg, waistCm }),
      });
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen");
        if (prev) {
          setCached(PROGRESS_CACHE_KEY, prev, 600_000);
          setCacheRev((v) => v + 1);
        }
        if (prevHome) {
          setCached(HOME_DATA_CACHE_KEY, prevHome, 900_000);
          window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: prevHome }));
        }
        return;
      }
      toast.success("Gewicht gespeichert");
      invalidateCache(PROGRESS_CACHE_KEY);
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

  const showSkeleton = loading && !displayData;
  const lastWeight = analytics.currentKg ?? profile?.weightKg;

  const homeStreak =
    getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true })
      ?.nutritionStreak?.currentDays ??
    dashboard?.streaks?.active?.currentDays ??
    dashboard?.streaks?.training?.currentDays ??
    0;
  const latestBody = entries[0];
  const bodyFat =
    latestBody?.bodyFatPct != null ? Number(latestBody.bodyFatPct) : null;

  const tabs = [
    { id: "overview" as const, label: "Übersicht" },
    { id: "weight" as const, label: "Gewicht" },
    { id: "photos" as const, label: "Fotos" },
    { id: "body" as const, label: "Körper" },
  ];

  return (
    <PageShell
      title="Fortschritt"
      subtitle="Übersicht · Diagramme · Rekorde"
      maxWidth="2xl"
      className="space-y-4 pb-28"
      bottomNav={false}
    >
      <PageIntro pageId="progress" />

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-accent/30 bg-accent text-white"
                : "border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="rounded-2xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] dark:shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Aktueller Streak
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
              🔥 {homeStreak} {homeStreak === 1 ? "Tag" : "Tage"}
            </p>
          </div>

          <ProgressOverviewCards
            currentKg={lastWeight ?? null}
            targetKg={profile?.targetWeightKg ?? null}
            trainingSessions={dashboard?.trainingHistory?.length ?? 0}
            weekChangeKg={analytics.changeWeekKg}
          />

          {(bodyFat != null || lastWeight != null) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Körperfett
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                  {bodyFat != null ? `${bodyFat.toLocaleString("de-DE")} %` : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200/90 bg-white px-3 py-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Gewicht
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                  {lastWeight != null
                    ? `${lastWeight.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg`
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {showSkeleton && (
            <div className="space-y-4">
              <div className="h-36 rounded-2xl bg-zinc-200/70 border border-zinc-200 animate-pulse dark:bg-white/[0.03] dark:border-white/[0.06]" />
              <div className="h-48 rounded-2xl bg-zinc-200/70 border border-zinc-200 animate-pulse dark:bg-white/[0.03] dark:border-white/[0.06]" />
            </div>
          )}

          {!showSkeleton && dashboard && chartsReady && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white px-0.5">
                Gewichtsverlauf
              </h2>
              <ProgressChartsSection
                nutritionTrend={dashboard.nutritionTrend ?? []}
                calorieTarget={dashboard.calorieTarget ?? 0}
                proteinTargetG={dashboard.proteinTargetG ?? 0}
                weightChartPoints={analytics.chartPoints}
                weightPeriod={period}
                onWeightPeriodChange={setPeriod}
                trainingVolumeTrend={dashboard.trainingVolumeTrend ?? []}
                trainingFrequencyTrend={dashboard.trainingFrequencyTrend ?? []}
              />
            </section>
          )}

          {!showSkeleton && (
            <ProgressWeeklyIntelligenceCard
              intelligence={weeklyIntelligence}
              adaptiveRecommendations={adaptiveRecommendations}
            />
          )}

          {!showSkeleton && dashboard && (
            <>
              <ProgressStatsSection
                trainingHistory={dashboard.trainingHistory ?? []}
                streaks={dashboard.streaks ?? { training: null, active: null }}
                personalRecords={dashboard.personalRecords ?? []}
              />
              <TrainingHistorySection sessions={dashboard.trainingHistory ?? []} />
            </>
          )}
        </>
      ) : null}

      {tab === "weight" && !showSkeleton ? (
        <div ref={logRef} className="card-premium p-4 scroll-mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Gewicht eintragen
          </h2>
          {lastWeight != null && (
            <p className="text-2xl font-bold text-accent tabular-nums">
              {lastWeight.toLocaleString("de-DE", { minimumFractionDigits: 1 })} kg
              <span className="text-xs font-normal text-zinc-500 ml-2">aktuell</span>
            </p>
          )}
          {analytics.changeWeekKg != null && (
            <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
              {analytics.changeWeekKg > 0 ? "+" : ""}
              {analytics.changeWeekKg.toFixed(1)} kg in 7 Tagen
              {profile?.targetWeightKg != null
                ? ` · Ziel ${profile.targetWeightKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
                : ""}
            </p>
          )}
          <WeightInput initialKg={lastWeight} onSave={saveWeight} />
          {dashboard && chartsReady ? (
            <ProgressChartsSection
              nutritionTrend={dashboard.nutritionTrend ?? []}
              calorieTarget={dashboard.calorieTarget ?? 0}
              proteinTargetG={dashboard.proteinTargetG ?? 0}
              weightChartPoints={analytics.chartPoints}
              weightPeriod={period}
              onWeightPeriodChange={setPeriod}
              trainingVolumeTrend={dashboard.trainingVolumeTrend ?? []}
              trainingFrequencyTrend={dashboard.trainingFrequencyTrend ?? []}
            />
          ) : null}
        </div>
      ) : null}

      {tab === "photos" && !showSkeleton ? (
        <div className="card-premium p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Vorher / Nachher
          </h3>
          <Input type="file" accept="image/*" onChange={uploadPhoto} className="text-sm" />
          {photos.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              Noch keine Progress-Fotos. Lade ein privates Vorher-Bild hoch — nur du siehst es.
            </p>
          ) : (
            <>
              {photos.length >= 2 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400">
                      Vorher
                      {photos[photos.length - 1]?.takenAt
                        ? ` · ${format(new Date(photos[photos.length - 1]!.takenAt!), "dd.MM.")}`
                        : ""}
                    </p>
                    <Image
                      src={photos[photos.length - 1]!.imageUrl}
                      alt="Vorher"
                      width={200}
                      height={200}
                      unoptimized
                      className="w-full h-32 object-cover"
                    />
                  </div>
                  <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                    <p className="text-[10px] text-zinc-500 px-2 py-1 bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400">
                      Nachher
                      {photos[0]?.takenAt
                        ? ` · ${format(new Date(photos[0]!.takenAt!), "dd.MM.")}`
                        : ""}
                    </p>
                    <Image
                      src={photos[0]!.imageUrl}
                      alt="Nachher"
                      width={200}
                      height={200}
                      unoptimized
                      className="w-full h-32 object-cover"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="flex gap-3 items-center rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900/60"
                  >
                    <Image
                      src={p.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-500">
                        {p.takenAt ? format(new Date(p.takenAt), "dd.MM.yyyy") : "—"}
                      </p>
                      {p.aiProgress && (
                        <p className="text-[11px] text-zinc-600 truncate dark:text-zinc-300">
                          {p.aiProgress}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "body" && !showSkeleton ? (
        <section className="space-y-4">
          {transformation && <BodyTransformationCard data={transformation} />}
          <BodyMeasurementsCard
            latest={entries[0] ?? null}
            onSaved={() => {
              invalidateCache(PROGRESS_CACHE_KEY);
              reload();
            }}
          />
        </section>
      ) : null}
    </PageShell>
  );
}
