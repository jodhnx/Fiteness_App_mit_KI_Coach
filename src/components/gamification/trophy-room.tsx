"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BADGE_TIER_LABELS,
  ACHIEVEMENT_CATEGORIES,
  type BadgeTier,
} from "@/lib/achievement-catalog";
import { tierGradient } from "@/components/gamification/tier-styles";
import { AchievementRow } from "@/components/gamification/achievement-row";
import type { AchievementProgress } from "@/lib/achievement-engine";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const TROPHY_TIERS: BadgeTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "mythic",
  "legendary",
];

const TIER_SECTION_LABELS: Record<BadgeTier, string> = {
  bronze: "Bronze Trophäen",
  silver: "Silber Trophäen",
  gold: "Gold Trophäen",
  platinum: "Platin Trophäen",
  diamond: "Diamant Trophäen",
  mythic: "Mythic Trophäen",
  legendary: "Legendäre Trophäen",
};

type ViewMode = "tiers" | "list";

export function TrophyRoom({ achievements }: { achievements: AchievementProgress[] }) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<BadgeTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "earned" | "locked" | "progress">(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("tiers");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return achievements.filter((a) => {
      if (tierFilter !== "all" && a.tier !== tierFilter) return false;
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (statusFilter === "earned" && !a.earned) return false;
      if (statusFilter === "locked" && a.earned) return false;
      if (statusFilter === "progress" && (a.earned || a.progressPercent <= 0)) return false;
      if (q) {
        const hay = `${a.name} ${a.description} ${a.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [achievements, search, tierFilter, statusFilter, categoryFilter]);

  const byTier = useMemo(() => {
    const map = new Map<BadgeTier, { earned: AchievementProgress[]; locked: AchievementProgress[] }>();
    for (const t of TROPHY_TIERS) {
      map.set(t, { earned: [], locked: [] });
    }
    for (const a of filtered) {
      const tier = a.tier as BadgeTier;
      if (!TROPHY_TIERS.includes(tier)) continue;
      const bucket = map.get(tier)!;
      if (a.earned) bucket.earned.push(a);
      else bucket.locked.push(a);
    }
    return map;
  }, [filtered]);

  const totalEarned = achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Trophäenraum — {totalEarned} von {achievements.length} Erfolgen freigeschaltet
      </p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Erfolg suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900/80 border-zinc-700"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...TROPHY_TIERS] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTierFilter(t === "all" ? "all" : t)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
              tierFilter === t
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200"
                : "border-zinc-700 text-zinc-400"
            )}
          >
            {t === "all" ? "Alle Stufen" : BADGE_TIER_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: "Alle" },
            { id: "earned", label: "Freigeschaltet" },
            { id: "progress", label: "In Arbeit" },
            { id: "locked", label: "Gesperrt" },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs border",
              statusFilter === s.id
                ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
                : "border-zinc-700 text-zinc-500"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs border",
            categoryFilter === "all"
              ? "border-white/30 text-white"
              : "border-zinc-700 text-zinc-500"
          )}
        >
          Alle Kategorien
        </button>
        {ACHIEVEMENT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryFilter(c.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs border",
              categoryFilter === c.id
                ? "border-white/30 text-white"
                : "border-zinc-700 text-zinc-500"
            )}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("tiers")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-lg border",
            view === "tiers" ? "border-cyan-500/40 text-cyan-200" : "border-zinc-700 text-zinc-500"
          )}
        >
          Stufen-Ansicht
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "text-xs px-3 py-1.5 rounded-lg border",
            view === "list" ? "border-cyan-500/40 text-cyan-200" : "border-zinc-700 text-zinc-500"
          )}
        >
          Listen-Ansicht
        </button>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-zinc-500 py-8 text-center">Keine Erfolge für diese Filter.</p>
      )}

      {view === "list" ? (
        <div className="space-y-2">
          {filtered.map((a) => (
            <AchievementRow key={a.id} a={a} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {TROPHY_TIERS.map((tier) => {
            const { earned, locked } = byTier.get(tier) ?? { earned: [], locked: [] };
            if (earned.length === 0 && locked.length === 0) return null;
            return (
              <section key={tier} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {TIER_SECTION_LABELS[tier]}
                  </h3>
                  <span className="text-xs text-zinc-500">
                    {earned.length} / {earned.length + locked.length}
                  </span>
                </div>
                {earned.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {earned.map((a) => (
                      <div
                        key={a.id}
                        className={cn(
                          "rounded-2xl border p-3 text-center",
                          "border-white/10 bg-gradient-to-br",
                          tierGradient(a.tier)
                        )}
                        title={a.earnedAt ? `Freigeschaltet: ${a.earnedAt}` : undefined}
                      >
                        <span className="text-2xl block mb-1">{a.icon}</span>
                        <p className="text-xs font-semibold text-white line-clamp-2">{a.name}</p>
                        <p className="text-[10px] text-cyan-400/90 mt-1">+{a.xpReward} XP</p>
                        {a.earnedAt && (
                          <p className="text-[9px] text-zinc-500 mt-1">
                            {new Date(a.earnedAt).toLocaleDateString("de-DE")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {locked.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {locked.map((a) => (
                      <div
                        key={a.id}
                        title={`${a.name} — ${a.progressPercent}%`}
                        className="rounded-xl border border-white/5 bg-zinc-900/80 p-2 text-center grayscale opacity-60"
                      >
                        <span className="text-lg">{a.icon}</span>
                        <p className="text-[9px] text-zinc-500 line-clamp-2 mt-1">{a.name}</p>
                        <div className="h-1 rounded-full bg-zinc-800 mt-1">
                          <div
                            className="h-full rounded-full bg-violet-500/60"
                            style={{ width: `${a.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
