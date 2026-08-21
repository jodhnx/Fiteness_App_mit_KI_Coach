"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import {
  CARDIO_CATALOG,
  CARDIO_CATEGORY_LABELS,
  cardioDisplayLabel,
  cardioEmoji,
  searchCardioCatalog,
  type CardioCategory,
} from "@/lib/cardio/cardio-types";
import { ChevronLeft, ChevronRight, Flame, Search } from "lucide-react";

type ActivityRow = {
  id: string;
  type: string;
  durationSec: number;
  caloriesBurned: number | null;
  notes: string | null;
  startedAt: string;
  sourceProvider?: string | null;
};

export default function CardioHubPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data } = useCachedFetch<{
    activities: ActivityRow[];
    week: { totalCalories: number };
  }>("cardio-activities", "/api/activities", 60_000, 4_000, {
    revalidateOnMount: false,
    staleRatio: 0.9,
  });

  const today = new Date().toDateString();
  const todayActs = (data?.activities ?? []).filter(
    (a) => new Date(a.startedAt).toDateString() === today
  );
  const todayKcal = todayActs.reduce((s, a) => s + (a.caloriesBurned ?? 0), 0);

  const filtered = useMemo(() => searchCardioCatalog(q, 80), [q]);

  const byCategory = useMemo(() => {
    const map = new Map<CardioCategory, typeof CARDIO_CATALOG>();
    for (const c of filtered) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <PageShell
      title="Cardio"
      className="space-y-5 pb-24"
      bottomNav={false}
      action={
        <button
          type="button"
          onClick={() => router.push("/workouts")}
          className="h-10 w-10 rounded-2xl border border-zinc-700 bg-zinc-900/80 flex items-center justify-center text-zinc-200 active:scale-95"
          aria-label="Zurück zum Training"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      }
    >
      <button
        type="button"
        onClick={() => router.push("/workouts")}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent -mt-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Training
      </button>

      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-orange-300/80 font-semibold">
            Heute Cardio
          </p>
          <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
            {Math.round(todayKcal)}{" "}
            <span className="text-sm font-medium text-zinc-400">kcal</span>
          </p>
        </div>
        <Flame className="h-8 w-8 text-orange-400" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Aktivität suchen (z. B. Rad, HIIT…)"
          className="w-full h-11 rounded-2xl border border-zinc-700 bg-zinc-900/80 pl-10 pr-3 text-sm text-white placeholder:text-zinc-500"
        />
      </div>

      <section className="space-y-4">
        {[...byCategory.entries()].map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              {CARDIO_CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    router.push(`/workouts/cardio/log?type=${item.id}`)
                  }
                  className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/70 px-4 py-3.5 text-left active:scale-[0.99] transition-transform"
                >
                  <span className="text-2xl w-10 text-center" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="flex-1 font-semibold text-white">
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-600" />
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">
            Keine Aktivität gefunden — anderen Suchbegriff versuchen.
          </p>
        )}
      </section>

      {todayActs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            Heute
          </h2>
          <div className="divide-y divide-zinc-800/80 rounded-2xl border border-white/[0.06] overflow-hidden">
            {todayActs.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-zinc-900/50 px-4 py-3"
              >
                <span className="text-xl">
                  {cardioEmoji(a.type as never, a.notes)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {cardioDisplayLabel(a.type as never, a.notes)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {Math.round(a.durationSec / 60)} min
                    {a.sourceProvider ? ` · ${a.sourceProvider}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-orange-300 tabular-nums">
                  {a.caloriesBurned ?? 0} kcal
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-zinc-400">
            Gesamt heute:{" "}
            <span className="text-orange-300 font-semibold tabular-nums">
              🔥 {Math.round(todayKcal)} kcal
            </span>
          </p>
        </section>
      )}
    </PageShell>
  );
}
