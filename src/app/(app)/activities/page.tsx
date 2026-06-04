"use client";

import { useCallback, useMemo, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { getCached, invalidateCache } from "@/lib/client-cache";
import { invalidateAllNutritionCaches } from "@/lib/nutrition-sync";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ACTIVITY_TYPE_ORDER,
  ACTIVITY_LABELS,
  formatDuration,
  formatDistance,
  formatPace,
} from "@/lib/activity-types";
import type { HealthDashboardPayload } from "@/lib/activity-health";
import type { EnduranceActivityType } from "@prisma/client";
import { ActivityRings } from "@/components/activities/activity-rings";
import { SleepTracker } from "@/components/activities/sleep-tracker";
import { StatChart } from "@/components/charts/stat-chart";
import {
  Footprints,
  Flame,
  Timer,
  MapPin,
  Plus,
  Trophy,
  TrendingUp,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityRow = {
  id: string;
  type: EnduranceActivityType;
  startedAt: string;
  durationSec: number;
  distanceM: number | null;
  caloriesBurned: number | null;
  avgSpeedKmh: number | null;
  notes: string | null;
};

type DashboardResponse = {
  dashboard: HealthDashboardPayload;
  activities: ActivityRow[];
  sleepWeek?: {
    avgHours: number | null;
    lowNightsLast7: number;
    nightsLogged: number;
  };
};

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Footprints;
  className?: string;
}) {
  return (
    <div className={cn("card-premium p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-accent shrink-0" />
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function ActivitiesPage() {
  const [type, setType] = useState<EnduranceActivityType>("RUNNING");
  const [durationMin, setDurationMin] = useState("30");
  const [distanceKm, setDistanceKm] = useState("");
  const [calories, setCalories] = useState("");
  const [speedKmh, setSpeedKmh] = useState("");
  const [notes, setNotes] = useState("");
  const [stepsInput, setStepsInput] = useState("");
  const [editingSteps, setEditingSteps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [chartTab, setChartTab] = useState<"steps" | "calories" | "distance">("steps");
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");

  const { data, loading, reload } = useCachedFetch<DashboardResponse>(
    "activities-dashboard",
    "/api/activities/dashboard",
    120_000,
    6_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const dash = data?.dashboard;

  const chartData = useMemo(() => {
    if (!dash) return [];
    if (chartTab === "steps") {
      return dash.stepHistory.map((d) => ({ label: d.label, value: d.steps }));
    }
    if (chartTab === "calories") {
      return dash.chartWeek.map((d) => ({ label: d.label, value: d.calories }));
    }
    return dash.chartWeek.map((d) => ({ label: d.label, value: d.distanceKm }));
  }, [dash, chartTab]);

  const saveSteps = useCallback(async () => {
    const steps = parseInt(stepsInput.replace(/\s/g, ""), 10);
    if (!Number.isFinite(steps) || steps < 0) {
      toast.error("Bitte gültige Schrittzahl eingeben");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/activities/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steps }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Schritte konnten nicht gespeichert werden");
      return;
    }
    toast.success("Schritte gespeichert");
    setEditingSteps(false);
    invalidateCache("activities-dashboard");
    invalidateCache("home-data");
    reload();
  }, [stepsInput, reload]);

  const logActivity = useCallback(async () => {
    const durationSec = Math.round(parseFloat(durationMin) * 60);
    if (!durationSec || durationSec <= 0) {
      toast.error("Bitte gültige Dauer eingeben");
      return;
    }
    const distanceM = distanceKm ? parseFloat(distanceKm) * 1000 : undefined;
    let avgSpeedKmh = speedKmh ? parseFloat(speedKmh) : undefined;
    if (!avgSpeedKmh && distanceM && durationSec > 0) {
      avgSpeedKmh = Math.round((distanceM / 1000 / (durationSec / 3600)) * 10) / 10;
    }
    setSaving(true);
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        durationSec,
        distanceM,
        caloriesBurned: calories ? parseInt(calories, 10) : undefined,
        avgSpeedKmh,
        notes: notes.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { error?: string }).error ?? "Speichern fehlgeschlagen");
      return;
    }
    toast.success("Aktivität gespeichert");
    setShowForm(false);
    setNotes("");
    invalidateCache("activities-dashboard");
    invalidateCache("home-data");
    invalidateAllNutritionCaches();
    reload();
  }, [type, durationMin, distanceKm, calories, speedKmh, notes, reload]);

  const records = dash?.records;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-28">
      <PageHeader
        title="Aktivitäten"
        subtitle="Schritte, Kalorien & Ausdauer – wie Strava & Apple Health"
        action={
          <Button size="sm" className="btn-accent" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4 mr-1" />
            Neu
          </Button>
        }
      />

      {loading && !dash && getCached("activities-dashboard") === null && (
        <div className="grid grid-cols-2 gap-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-800/60" />
          ))}
        </div>
      )}

      {dash && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Schritte heute"
              value={dash.today.steps.toLocaleString("de-AT")}
              sub={`Ziel ${dash.today.stepGoal.toLocaleString("de-AT")} · Streak ${dash.stepStreak}d`}
              icon={Footprints}
              className="col-span-2 sm:col-span-1"
            />
            <MetricCard
              label="Kalorien verbrannt"
              value={`${dash.today.caloriesBurned}`}
              sub="Aktivität + Schritte"
              icon={Flame}
            />
            <MetricCard
              label="Aktive Minuten"
              value={String(dash.today.activeMinutes)}
              sub={`Ziel ${dash.goals.activeMinuteGoal} min`}
              icon={Timer}
            />
            <MetricCard
              label="Distanz heute"
              value={formatDistance(dash.today.distanceM)}
              icon={MapPin}
            />
          </div>

          <ActivityRings move={dash.rings.move} exercise={dash.rings.exercise} steps={dash.rings.steps} />

          <SleepTracker
            avgHours={data?.sleepWeek?.avgHours ?? null}
            lowNights={data?.sleepWeek?.lowNightsLast7 ?? 0}
            onSaved={() => {
              invalidateCache("activities-dashboard");
              invalidateCache("home-data");
              invalidateCache("coach-insights");
              reload();
            }}
          />

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Woche", value: String(dash.week.count), sub: "Aktivitäten" },
              { label: "Ø Schritte", value: String(dash.week.avgSteps), sub: "/ Tag" },
              { label: "Wochen-km", value: formatDistance(dash.week.totalDistanceM), sub: formatDuration(dash.week.totalDurationSec) },
            ].map((s) => (
              <div key={s.label} className="card-premium p-3 text-center">
                <p className="text-lg font-bold text-white tabular-nums">{s.value}</p>
                <p className="text-[10px] text-zinc-500 uppercase">{s.label}</p>
                <p className="text-[10px] text-zinc-600">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="card-premium p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Kalorienverbrauch</h2>
              <span className="text-xs text-zinc-500">Mit Ernährung verknüpft</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-zinc-900/80 p-3">
                <p className="text-zinc-500 text-[10px] uppercase">Ruheumsatz</p>
                <p className="font-bold text-white tabular-nums">{dash.calorieBurn.bmr}</p>
                <p className="text-[10px] text-zinc-600">kcal/Tag</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 p-3">
                <p className="text-zinc-500 text-[10px] uppercase">Aktivität</p>
                <p className="font-bold text-accent tabular-nums">{dash.calorieBurn.activityCalories}</p>
                <p className="text-[10px] text-zinc-600">kcal heute</p>
              </div>
              <div className="rounded-xl bg-zinc-900/80 p-3">
                <p className="text-zinc-500 text-[10px] uppercase">Gesamt</p>
                <p className="font-bold text-white tabular-nums">{dash.calorieBurn.totalBurned}</p>
                <p className="text-[10px] text-zinc-600">kcal geschätzt</p>
              </div>
            </div>
          </div>

          <div className="card-premium p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Footprints className="h-4 w-4 text-emerald-400" />
                Schrittetracking
              </h2>
              <button
                type="button"
                onClick={() => {
                  setStepsInput(String(dash.today.steps));
                  setEditingSteps((e) => !e);
                }}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Eintragen
              </button>
            </div>
            {editingSteps ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  placeholder="Schritte heute"
                  className="bg-zinc-900"
                />
                <Button onClick={saveSteps} disabled={saving} size="sm">
                  OK
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                {(["today", "week", "month"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-xs font-medium",
                      period === p ? "bg-accent-soft text-accent border border-accent" : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {p === "today" ? "Heute" : p === "week" ? "Woche" : "Monat"}
                  </button>
                ))}
              </div>
            )}
            <p className="text-sm text-zinc-400 mt-3 tabular-nums">
              {period === "today" && `${dash.today.steps.toLocaleString("de-AT")} Schritte`}
              {period === "week" && `Ø ${dash.week.avgSteps.toLocaleString("de-AT")} / Tag diese Woche`}
              {period === "month" && `${dash.month.totalSteps.toLocaleString("de-AT")} Schritte im Monat`}
            </p>
          </div>

          <div className="card-premium p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Fortschritt
              </h2>
              <div className="flex gap-1">
                {(["steps", "calories", "distance"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartTab(t)}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full",
                      chartTab === t ? "bg-accent text-[var(--accent-fg)]" : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {t === "steps" ? "Schritte" : t === "calories" ? "kcal" : "km"}
                  </button>
                ))}
              </div>
            </div>
            <StatChart data={chartData} type="bar" />
          </div>

          {records && (
            <div className="card-premium p-4 space-y-3">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Persönliche Rekorde
              </h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-zinc-900/80 p-3">
                  <p className="text-zinc-500 text-[10px]">Schnellste 5 km</p>
                  <p className="font-bold text-white">
                    {records.fastest5kmSec ? formatDuration(records.fastest5kmSec) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900/80 p-3">
                  <p className="text-zinc-500 text-[10px]">Schnellste 10 km</p>
                  <p className="font-bold text-white">
                    {records.fastest10kmSec ? formatDuration(records.fastest10kmSec) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900/80 p-3">
                  <p className="text-zinc-500 text-[10px]">Längste Aktivität</p>
                  <p className="font-bold text-white">
                    {records.longestActivitySec ? formatDuration(records.longestActivitySec) : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900/80 p-3">
                  <p className="text-zinc-500 text-[10px]">Beste Woche</p>
                  <p className="font-bold text-white">
                    {formatDistance(records.bestWeekDistanceM)} · {records.bestWeekCount}×
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="card-premium p-4 space-y-4">
          <h2 className="font-semibold text-white">Aktivität erstellen</h2>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPE_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "text-xs rounded-full px-3 py-1.5",
                  type === t ? "btn-accent" : "bg-zinc-800 text-zinc-400"
                )}
              >
                {ACTIVITY_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500">Dauer (Min)</label>
              <Input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Distanz (km)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="optional"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Geschwindigkeit (km/h)</label>
              <Input
                type="number"
                step="0.1"
                placeholder="auto"
                value={speedKmh}
                onChange={(e) => setSpeedKmh(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-700"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Kalorien</label>
              <Input
                type="number"
                placeholder="optional"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-700"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Notizen</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wetter, Route, Gefühl…"
              className="mt-1 bg-zinc-900 border-zinc-700"
            />
          </div>
          <Button className="w-full btn-accent" onClick={logActivity} disabled={saving}>
            Aktivität speichern
          </Button>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Letzte Aktivitäten
        </h2>
        {(data?.activities ?? []).map((a) => {
          const pace =
            a.distanceM && a.distanceM >= 1000 && a.durationSec > 0
              ? a.durationSec / (a.distanceM / 1000)
              : null;
          return (
            <div key={a.id} className="card-premium p-4">
              <p className="font-medium text-white">{ACTIVITY_LABELS[a.type]}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {new Date(a.startedAt).toLocaleDateString("de-AT")} · {formatDuration(a.durationSec)}
                {a.distanceM ? ` · ${formatDistance(a.distanceM)}` : ""}
                {pace ? ` · ${formatPace(pace)}` : a.avgSpeedKmh ? ` · ${a.avgSpeedKmh} km/h` : ""}
                {a.caloriesBurned ? ` · ${a.caloriesBurned} kcal` : ""}
              </p>
              {a.notes && <p className="text-xs text-zinc-400 mt-2 italic">{a.notes}</p>}
            </div>
          );
        })}
        {data && data.activities.length === 0 && !loading && (
          <p className="text-center text-sm text-zinc-500 py-8">
            Noch keine Aktivitäten – tippe auf „Neu“.
          </p>
        )}
      </section>
    </div>
  );
}
