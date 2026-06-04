"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { FullscreenPage } from "@/components/ui/fullscreen-page";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const MUSCLES = [
  { value: "", label: "Alle" },
  { value: "CHEST", label: "Brust" },
  { value: "BACK", label: "Rücken" },
  { value: "SHOULDERS", label: "Schultern" },
  { value: "BICEPS", label: "Bizeps" },
  { value: "TRICEPS", label: "Trizeps" },
  { value: "LEGS", label: "Beine" },
  { value: "ABS", label: "Bauch" },
] as const;

const DIFFICULTIES = [
  { value: "", label: "Alle" },
  { value: "BEGINNER", label: "Anfänger" },
  { value: "INTERMEDIATE", label: "Mittel" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

type Exercise = {
  id: string;
  slug: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  equipment: string;
};

export default function ExercisePickPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounce(q, 200);
  const [muscle, setMuscle] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const searchUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "80", sort: "popularity" });
    if (debouncedQ) params.set("q", debouncedQ);
    if (muscle) params.set("muscle", muscle);
    if (difficulty) params.set("difficulty", difficulty);
    return `/api/exercises?${params}`;
  }, [debouncedQ, muscle, difficulty]);

  useEffect(() => {
    setLoading(true);
    fetch(searchUrl)
      .then((r) => r.json())
      .then((d) => setExercises(d.exercises ?? []))
      .finally(() => setLoading(false));
  }, [searchUrl]);

  return (
    <FullscreenPage title="Übung wählen" subtitle="Suche & Filter">
      <div className="max-w-lg mx-auto w-full pb-8">
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md px-4 py-3 border-b border-zinc-800/50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Übung suchen..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-12 pl-12 rounded-xl"
              autoFocus
            />
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
            {MUSCLES.map((m) => (
              <button
                key={m.value || "all"}
                type="button"
                onClick={() => setMuscle(m.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                  muscle === m.value ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value || "all-d"}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                  difficulty === d.value
                    ? "bg-violet-500 text-white"
                    : "bg-zinc-800 text-zinc-400"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-3 space-y-2">
          {loading && (
            <p className="text-center text-zinc-500 py-8 text-sm animate-pulse">Lädt…</p>
          )}
          {!loading &&
            exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => router.push(`/workouts/exercises/${ex.slug}`)}
                className="w-full text-left card-premium p-4 active:scale-[0.99] duration-100"
              >
                <p className="font-semibold text-white">{ex.name}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {ex.muscleGroup} · {ex.difficulty} · {ex.equipment}
                </p>
              </button>
            ))}
        </div>
      </div>
    </FullscreenPage>
  );
}
