"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { LevelProgressBar } from "@/components/gamification/level-progress-bar";
import { AchievementRow } from "@/components/gamification/achievement-row";
import { ChallengesPanel } from "@/components/gamification/challenges-panel";
import { TrophyRoom } from "@/components/gamification/trophy-room";
import { PersonalRecordsPanel } from "@/components/gamification/personal-records-panel";
import { ACHIEVEMENT_CATEGORIES } from "@/lib/achievement-catalog";
import {
  createEmptyGamificationPayload,
  type GamificationApiPayload,
} from "@/lib/gamification-defaults";
import { pushUnlockEvent } from "@/components/gamification/gamification-unlock-toast";
import { getCached } from "@/lib/client-cache";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Target, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const GAMIFICATION_URL = "/api/gamification";
const FETCH_TIMEOUT_MS = 10_000;

function ErfolgeSkeleton() {
  return (
    <div className="space-y-6 pb-4 animate-pulse">
      <div className="h-16 rounded-2xl bg-white/5" />
      <div className="h-28 rounded-2xl bg-white/5" />
      <div className="h-40 rounded-2xl bg-white/5" />
    </div>
  );
}

export default function ErfolgePage() {
  const { data: rawData, loading, error, timedOut, reload } = useCachedFetch<GamificationApiPayload>(
    "gamification-full",
    GAMIFICATION_URL,
    120_000,
    FETCH_TIMEOUT_MS,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );
  const [category, setCategory] = useState<string>("all");
  const [tab, setTab] = useState<
    "overview" | "achievements" | "challenges" | "trophies" | "records"
  >("overview");

  const data = useMemo(
    () => rawData ?? (!loading && !error ? createEmptyGamificationPayload() : null),
    [rawData, loading, error]
  );

  useEffect(() => {
    if (!rawData) return;
    const stored = sessionStorage.getItem("erfolge-unlocked-count");
    const prev = stored ? Number(stored) : null;
    if (prev != null && rawData.unlockedCount > prev) {
      const newly = rawData.achievements.filter((a) => a.earned && a.earnedAt);
      const latest = newly.sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))[0];
      if (latest) {
        pushUnlockEvent({
          name: latest.name,
          icon: latest.icon,
          tier: latest.tier,
          xpReward: latest.xpReward,
        });
      }
    }
    sessionStorage.setItem("erfolge-unlocked-count", String(rawData.unlockedCount));
  }, [rawData?.unlockedCount, rawData?.achievements]);

  const filtered = useMemo(() => {
    if (!data?.achievements) return [];
    if (category === "all") return data.achievements;
    return data.achievements.filter((a) => a.category === category);
  }, [data?.achievements, category]);

  const earned = data?.achievements.filter((a) => a.earned) ?? [];
  const inProgress = data?.achievements.filter((a) => !a.earned && a.progressPercent > 0) ?? [];

  const hasCache = getCached<GamificationApiPayload>("gamification-full") !== null;

  if (loading && !data && !hasCache) {
    return <ErfolgeSkeleton />;
  }

  if ((error || timedOut) && !rawData) {
    return (
      <div className="py-12 max-w-md mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-semibold text-white">Erfolge konnten nicht geladen werden</h2>
        <p className="text-sm text-zinc-400">{error ?? "Zeitüberschreitung"}</p>
        <p className="text-xs text-zinc-600">
          Prüfe die Konsole (F12) und ob die Datenbank migriert ist:{" "}
          <code className="text-zinc-500">npx prisma db push</code>
        </p>
        <Button type="button" onClick={() => reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    );
  }

  const display = data ?? createEmptyGamificationPayload();

  return (
    <div className="space-y-6 pb-4">
      {display._degraded && display._error && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Teilweise Daten nicht verfügbar ({display._error}). Anzeige mit Standardwerten.
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏆</span> Erfolge
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Level, XP, Badges und Challenges – dein Fortschritt
          </p>
        </div>
        <Link
          href="/erfolge/trophaeen"
          className="text-sm text-cyan-400 hover:underline shrink-0 flex items-center gap-1"
        >
          <Medal className="h-4 w-4" />
          Trophäenraum
        </Link>
      </div>

      <div className="card-premium p-4 space-y-3">
        <LevelProgressBar
          level={display.level.level}
          totalXP={display.totalXP}
          progressPercent={display.level.progressPercent}
          xpToNext={display.level.xpToNext}
        />
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/5 py-2">
            <p className="text-zinc-500">Erfolge</p>
            <p className="text-lg font-bold text-white">
              {display.unlockedCount}/{display.totalAchievements}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 py-2">
            <p className="text-zinc-500">Streak</p>
            <p className="text-lg font-bold text-orange-400">
              {display.streak?.currentDays ?? 0}d
            </p>
          </div>
          <div className="rounded-lg bg-white/5 py-2">
            <p className="text-zinc-500">Challenges</p>
            <p className="text-lg font-bold text-cyan-400">{display.challenges.length}</p>
          </div>
        </div>
      </div>

      {display.totalAchievements === 0 && (
        <p className="text-sm text-zinc-500 text-center px-4">
          Noch keine Erfolge in der Datenbank. Führe{" "}
          <code className="text-zinc-400">npm run db:seed</code> aus, um Erfolge anzulegen.
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: "overview", label: "Übersicht" },
            { id: "trophies", label: "Trophäen" },
            { id: "achievements", label: "Erfolge" },
            { id: "challenges", label: "Challenges" },
            { id: "records", label: "Rekorde" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              tab === t.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-white/5 text-zinc-400"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Fast geschafft
              </h2>
              <div className="space-y-2">
                {inProgress
                  .sort((a, b) => b.progressPercent - a.progressPercent)
                  .slice(0, 4)
                  .map((a) => (
                    <AchievementRow key={a.id} a={a} />
                  ))}
              </div>
            </section>
          )}
          {earned.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-white mb-2">Zuletzt freigeschaltet</h2>
              <div className="space-y-2">
                {earned
                  .filter((a) => a.earnedAt)
                  .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))
                  .slice(0, 3)
                  .map((a) => (
                    <AchievementRow key={a.id} a={a} />
                  ))}
              </div>
            </section>
          )}
          <ChallengesPanel challenges={display.challenges} />
        </div>
      )}

      {tab === "achievements" && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs",
                category === "all" ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-zinc-500"
              )}
            >
              Alle
            </button>
            {ACHIEVEMENT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs whitespace-nowrap",
                  category === c.id ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-zinc-500"
                )}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">Keine Erfolge in dieser Kategorie.</p>
            ) : (
              filtered.map((a) => <AchievementRow key={a.id} a={a} />)
            )}
          </div>
        </div>
      )}

      {tab === "trophies" && (
        <div className="card-premium p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Medal className="h-4 w-4 text-amber-400" />
            Trophäenraum
          </h2>
          <TrophyRoom achievements={display.achievements} />
        </div>
      )}

      {tab === "records" && (
        <div className="card-premium p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Persönliche Rekorde</h2>
          <PersonalRecordsPanel />
        </div>
      )}

      {tab === "challenges" && (
        <div className="space-y-4">
          {display.challenges.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">Keine Challenges vorhanden.</p>
          ) : (
            (["daily", "weekly", "monthly"] as const).map((period) => {
              const list = display.challenges.filter((c) => c.period === period);
              if (list.length === 0) return null;
              const label =
                period === "daily" ? "Täglich" : period === "weekly" ? "Wöchentlich" : "Monatlich";
              return (
                <section key={period}>
                  <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-cyan-400" />
                    {label}
                  </h2>
                  <ChallengesPanel challenges={list} hideHeader />
                </section>
              );
            })
          )}
        </div>
      )}

      {tab === "overview" && display.xpHistory.length > 0 && (
        <section className="card-premium p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Letzte XP
          </h2>
          <ul className="space-y-2 text-xs">
            {display.xpHistory.slice(0, 8).map((x, i) => (
              <li key={i} className="flex justify-between text-zinc-400">
                <span className="truncate pr-2">
                  {x.reason.replace(/^xp:|^Achievement: /, "")}
                </span>
                <span className="text-cyan-400 shrink-0">+{x.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          void fetch("/api/gamification?refresh=1", { credentials: "same-origin" }).catch(() => {});
          reload();
        }}
        className="text-xs text-zinc-500 hover:text-zinc-300 w-full text-center flex items-center justify-center gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        Fortschritt aktualisieren
      </button>
    </div>
  );
}
