"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export type LibraryExercise = {
  id: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  equipment: string;
  ratingAvg: number | null;
  popularity: number;
};

type Options = {
  limit?: number;
  enabled?: boolean;
};

export function useExerciseLibrarySearch(
  search: string,
  filters: { muscle?: string; equipment?: string; difficulty?: string },
  options: Options = {}
) {
  const { limit = 120, enabled = true } = options;
  const debouncedQ = useDebounce(search.trim(), 250);
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: String(limit),
      sort: debouncedQ ? "name" : "popularity",
    });
    if (debouncedQ) params.set("q", debouncedQ);
    if (filters.muscle) params.set("muscle", filters.muscle);
    if (filters.equipment) params.set("equipment", filters.equipment);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);

    setLoading(true);
    setError(null);

    fetch(`/api/exercises?${params}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            (data as { error?: string }).error ??
            (res.status === 403
              ? "Bitte Onboarding abschließen"
              : `Übungen nicht geladen (${res.status})`);
          throw new Error(msg);
        }
        const list = (data.exercises ?? []) as LibraryExercise[];
        setExercises(list);
        setTotal((data as { total?: number }).total ?? list.length);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setExercises([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : "Suche fehlgeschlagen");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQ, filters.muscle, filters.equipment, filters.difficulty, limit, enabled]);

  return { exercises, loading, error, total, debouncedQ };
}
