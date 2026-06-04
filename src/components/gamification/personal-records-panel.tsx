"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Trophy } from "lucide-react";

type PrRecord = {
  id: string;
  value: number;
  unit: string;
  achievedAt: string;
  exercise: { name: string };
};

export function PersonalRecordsPanel() {
  const { data, loading } = useCachedFetch<{
    records: PrRecord[];
  }>("workouts-prs", "/api/workouts/prs", 120_000, 8_000, {
    revalidateOnMount: false,
  });

  const records = data?.records?.slice(0, 8) ?? [];

  if (loading && !data) {
    return <p className="text-sm text-zinc-500 animate-pulse">Rekorde laden…</p>;
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4 text-center">
        Noch keine persönlichen Rekorde — starte ein Training!
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {records.map((r) => (
        <li
          key={r.id}
          className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-950/15 px-3 py-2.5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="text-sm text-white truncate">{r.exercise?.name ?? "Übung"}</span>
          </div>
          <span className="text-sm font-bold text-amber-200 tabular-nums shrink-0 ml-2">
            {r.value} {r.unit}
          </span>
        </li>
      ))}
    </ul>
  );
}
