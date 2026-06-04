"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { ACHIEVEMENT_CATEGORIES, BADGE_TIER_LABELS, type BadgeTier } from "@/lib/achievement-catalog";
import { tierGradient } from "@/components/gamification/tier-styles";
import type { AchievementProgress } from "@/lib/achievement-engine";
import type { GamificationApiPayload } from "@/lib/gamification-defaults";
import { createEmptyGamificationPayload } from "@/lib/gamification-defaults";
import { cn } from "@/lib/utils";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const RARE_TIERS = new Set(["platinum", "diamond", "legendary"]);

export default function TrophaeenPage() {
  const { data: rawData, loading, error, reload } = useCachedFetch<GamificationApiPayload>(
    "gamification-full",
    "/api/gamification",
    90_000,
    25_000
  );

  const data = rawData ?? createEmptyGamificationPayload();

  const earned = useMemo(
    () => data.achievements.filter((a) => a.earned),
    [data.achievements]
  );
  const rare = earned.filter((a) => RARE_TIERS.has(a.tier));
  const byCategory = useMemo(() => {
    const map = new Map<string, AchievementProgress[]>();
    for (const a of earned) {
      const list = map.get(a.category) ?? [];
      list.push(a);
      map.set(a.category, list);
    }
    return map;
  }, [earned]);

  if (loading && !rawData) {
    return <p className="text-zinc-500 py-12 text-center">Trophäen werden geladen…</p>;
  }

  if (error && !rawData) {
    return (
      <div className="py-12 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-amber-400 mx-auto" />
        <p className="text-sm text-zinc-400">{error}</p>
        <Button type="button" variant="outline" onClick={() => reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut laden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-28">
      <Link href="/erfolge" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Erfolge
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Trophäensammlung</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {data.unlockedCount} Trophäen · {rare.length} seltene Erfolge
        </p>
      </div>

      {rare.length > 0 && (
        <section className="card-premium p-4">
          <h2 className="text-sm font-semibold text-violet-300 mb-3">✨ Seltene Erfolge</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {rare.map((a) => (
              <TrophyTile key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}

      {ACHIEVEMENT_CATEGORIES.map((cat) => {
        const list = byCategory.get(cat.id);
        if (!list?.length) return null;
        return (
          <section key={cat.id} className="card-premium p-4">
            <h2 className="text-sm font-semibold text-white mb-3">
              {cat.icon} {cat.label} ({list.length})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {list.map((a) => (
                <TrophyTile key={a.id} a={a} />
              ))}
            </div>
          </section>
        );
      })}

      {earned.length === 0 && (
        <p className="text-center text-zinc-500 py-8">
          Noch keine Trophäen – starte mit Training oder Ernährung!
        </p>
      )}
    </div>
  );
}

function TrophyTile({ a }: { a: AchievementProgress }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2 text-center bg-gradient-to-b from-white/5 to-transparent",
        a.earned ? "border-white/15" : "opacity-40 border-zinc-800"
      )}
      title={a.description}
    >
      <div
        className={cn(
          "mx-auto h-12 w-12 rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br mb-1",
          tierGradient(a.tier)
        )}
      >
        {a.icon}
      </div>
      <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{a.name}</p>
      <p className="text-[9px] text-zinc-500 mt-0.5">
        {BADGE_TIER_LABELS[a.tier as BadgeTier]}
      </p>
    </div>
  );
}
