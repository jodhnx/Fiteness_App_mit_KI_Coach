"use client";

import { useEffect, useRef, useState } from "react";
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
  const [libraryCount, setLibraryCount] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const retryRef = useRef(0);

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

    fetch(`/api/exercises?${params}`, {
      signal: controller.signal,
      credentials: "include",
    })
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
        const count = (data as { libraryCount?: number }).libraryCount ?? list.length;
        setLibraryCount(count);
        setSeeding(count > 0 && count < 50);
        setExercises(list);
        setTotal((data as { total?: number }).total ?? list.length);

        if (list.length === 0 && count < 50 && retryRef.current < 2) {
          retryRef.current += 1;
          setTimeout(() => {
            if (!controller.signal.aborted) {
              void fetch(`/api/exercises?${params}`, { credentials: "include" })
                .then((r) => r.json())
                .then((retry) => {
                  const retryList = (retry.exercises ?? []) as LibraryExercise[];
                  if (retryList.length > 0) {
                    setExercises(retryList);
                    setTotal(retry.total ?? retryList.length);
                    setLibraryCount(retry.libraryCount ?? retryList.length);
                    setSeeding(false);
                  }
                })
                .catch(() => undefined);
            }
          }, 1500);
        } else if (list.length > 0) {
          retryRef.current = 0;
        }
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

  return { exercises, loading, error, total, libraryCount, seeding, debouncedQ };
}
