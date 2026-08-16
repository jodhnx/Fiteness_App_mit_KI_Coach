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
import {
  pushUnlockEvent,
  pushLevelUpEvent,
} from "@/components/gamification/gamification-unlock-toast";
import { getCached } from "@/lib/client-cache";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Target, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const GAMIFICATION_URL = "/api/gamification";
const FETCH_TIMEOUT_MS = 6_000;

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
    { revalidateOnMount: true, staleRatio: 0.85 }
  );
  const [category, setCategory] = useState<string>("all");
  const [tab, setTab] = useState<
    "overview" | "achievements" | "challenges" | "trophies" | "records"
  >("overview");

  const data = useMemo(
    () =>
      rawData ??
      getCached<GamificationApiPayload>("gamification-full") ??
      (!loading && !error ? createEmptyGamificationPayload() : null),
    [rawData, loading, error]
  );

  useEffect(() => {
    if (!rawData) return;
    try {
      const stored = sessionStorage.getItem("erfolge-unlocked-count");
      const prev = stored ? Number(stored) : null;
      const unlocked = rawData.unlockedCount ?? 0;
      const achievements = Array.isArray(rawData.achievements)
        ? rawData.achievements
        : [];
      if (prev != null && unlocked > prev) {
        const newly = achievements.filter((a) => a.earned && a.earnedAt);
        const latest = newly.sort((a, b) =>
          (b.earnedAt ?? "").localeCompare(a.earnedAt ?? "")
        )[0];
        if (latest) {
          pushUnlockEvent({
            name: latest.name,
            icon: latest.icon,
            tier: latest.tier,
            xpReward: latest.xpReward,
          });
        }
      }
      sessionStorage.setItem("erfolge-unlocked-count", String(unlocked));

      const levelKey = "erfolge-last-level";
      const prevLevel = sessionStorage.getItem(levelKey);
      const curLevel = rawData.level?.level ?? 0;
      if (prevLevel != null && Number(prevLevel) < curLevel) {
        pushLevelUpEvent(curLevel);
      }
      sessionStorage.setItem(levelKey, String(curLevel));
    } catch (e) {
      console.error("[erfolge] unlock tracking failed", e);
    }
  }, [rawData?.unlockedCount, rawData?.achievements, rawData?.level?.level]);

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
      <div className="py-12 max-w-md mx-auto text-center space-y-4 px-4">
        <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-semibold text-white">
          Erfolge konnten nicht geladen werden
        </h2>
        <p className="text-sm text-zinc-400">
          Bitte prüfe deine Verbindung und versuche es erneut.
        </p>
        <Button type="button" onClick={() => reload()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    );
  }

  const display = data ?? createEmptyGamificationPayload();
  const rare = display.achievements.filter(
    (a) =>
      a.earned &&
      (a.tier === "diamond" || a.tier === "legendary" || a.tier === "mythic")
  );
  const nextUp = display.achievements
    .filter((a) => !a.earned)
    .sort((a, b) => b.progressPercent - a.progressPercent)
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Erfolge</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Level, Badges, Challenges und Rekorde
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

      <div className="rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950 p-4 space-y-3">
        <LevelProgressBar
          level={display.level.level}
          totalXP={display.totalXP}
          progressPercent={display.level.progressPercent}
          xpToNext={display.level.xpToNext}
        />
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl bg-white/[0.04] py-2.5 border border-white/[0.05]">
            <p className="text-zinc-500">Freigeschaltet</p>
            <p className="text-lg font-bold text-white tabular-nums">
              {display.unlockedCount}/{display.totalAchievements}
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] py-2.5 border border-white/[0.05]">
            <p className="text-zinc-500">Streak</p>
            <p className="text-lg font-bold text-orange-400 tabular-nums">
              {display.streak?.currentDays ?? 0}d
            </p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] py-2.5 border border-white/[0.05]">
            <p className="text-zinc-500">Challenges</p>
            <p className="text-lg font-bold text-cyan-400 tabular-nums">
              {display.challenges.length}
            </p>
          </div>
        </div>
      </div>

      {display.totalAchievements === 0 && loading && (
        <p className="text-sm text-zinc-500 text-center px-4">
          Erfolge werden initialisiert…
        </p>
      )}
      {display.totalAchievements === 0 && !loading && error && (
        <p className="text-sm text-amber-400/90 text-center px-4">
          Erfolge konnten nicht geladen werden. Bitte Seite neu laden.
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
          {nextUp.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-400" />
                Nächste erreichbare Erfolge
              </h2>
              <div className="space-y-2">
                {nextUp.map((a) => (
                  <AchievementRow key={a.id} a={a} />
                ))}
              </div>
            </section>
          )}
          {rare.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Seltene Erfolge
              </h2>
              <div className="space-y-2">
                {rare.slice(0, 4).map((a) => (
                  <AchievementRow key={a.id} a={a} />
                ))}
              </div>
            </section>
          )}
          {inProgress.length > 0 && nextUp.length === 0 && (
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
              <h2 className="text-sm font-semibold text-white mb-2">
                Freigeschaltet
              </h2>
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
            <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-8 text-center space-y-2">
              <p className="text-sm text-zinc-300">Noch keine Challenges geladen</p>
              <p className="text-xs text-zinc-500">
                Tippe auf Aktualisieren — Challenges werden automatisch eingerichtet.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => reload()}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Aktualisieren
              </Button>
            </div>
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
