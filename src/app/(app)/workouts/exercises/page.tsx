"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Input } from "@/components/ui/input";
import { useExerciseLibrarySearch, type LibraryExercise } from "@/hooks/use-exercise-library-search";
import { cn } from "@/lib/utils";
import { ChevronRight, Dumbbell, Search, Star, Clock } from "lucide-react";

const MUSCLES = [
  { id: "", label: "Alle" },
  { id: "CHEST", label: "Brust" },
  { id: "BACK", label: "Rücken" },
  { id: "SHOULDERS", label: "Schultern" },
  { id: "BICEPS", label: "Bizeps" },
  { id: "TRICEPS", label: "Trizeps" },
  { id: "LEGS", label: "Beine" },
  { id: "ABS", label: "Bauch" },
] as const;

const DIFFICULTY_DE: Record<string, string> = {
  BEGINNER: "Anfänger",
  INTERMEDIATE: "Mittel",
  ADVANCED: "Fortgeschritten",
};

const EQUIPMENT_DE: Record<string, string> = {
  BARBELL: "Langhantel",
  DUMBBELL: "Kurzhantel",
  MACHINE: "Maschine",
  CABLE: "Kabelzug",
  BODYWEIGHT: "Körpergewicht",
  KETTLEBELL: "Kettlebell",
  BAND: "Band",
  OTHER: "Sonstiges",
};

type Tab = "all" | "favorites" | "recent";

export default function ExercisesPage() {
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [recent, setRecent] = useState<LibraryExercise[]>([]);
  const [favorites, setFavorites] = useState<LibraryExercise[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selected, setSelected] = useState<LibraryExercise | null>(null);

  const isSearching = search.trim().length > 0;

  const { exercises: searchResults, loading: searchLoading } = useExerciseLibrarySearch(
    search,
    { muscle: muscle || undefined },
    { limit: 100, enabled: isSearching, debounceMs: 120 }
  );

  const { exercises: browseResults, loading: browseLoading } = useExerciseLibrarySearch(
    "",
    { muscle: muscle || undefined },
    { limit: 80, enabled: tab === "all" && !isSearching, debounceMs: 0 }
  );

  const loadLists = useCallback(async () => {
    setListsLoading(true);
    try {
      const [recentRes, favRes] = await Promise.all([
        fetch("/api/exercises/recent", { credentials: "include" }),
        fetch("/api/exercises?favorites=1", { credentials: "include" }),
      ]);
      const [recentData, favData] = await Promise.all([recentRes.json(), favRes.json()]);
      setRecent((recentData.exercises ?? []) as LibraryExercise[]);
      setFavorites((favData.exercises ?? []) as LibraryExercise[]);
    } catch {
      /* empty */
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const list = useMemo(() => {
    if (isSearching) return searchResults;
    if (tab === "favorites") return favorites;
    if (tab === "recent") return recent;
    return browseResults;
  }, [isSearching, searchResults, tab, favorites, recent, browseResults]);

  const loading = isSearching ? searchLoading : tab === "all" ? browseLoading : listsLoading;

  const tabs: { id: Tab; label: string; icon: typeof Star }[] = [
    { id: "all", label: "Alle", icon: Dumbbell },
    { id: "favorites", label: "Favoriten", icon: Star },
    { id: "recent", label: "Zuletzt", icon: Clock },
  ];

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-28">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="h-7 w-7 text-rose-400" />
          Übungen
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Exercise Hub · Bibliothek & Details</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input
          placeholder="Übung suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 pl-10 rounded-2xl bg-zinc-900 border-zinc-800"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MUSCLES.map((m) => (
          <button
            key={m.id || "all"}
            type="button"
            onClick={() => setMuscle(m.id)}
            className={cn(
              "rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0",
              muscle === m.id
                ? "bg-cyan-500 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!isSearching && (
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium",
                tab === t.id
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rounded-2xl border border-cyan-500/30 bg-zinc-900/80 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-white">{selected.name}</p>
              <p className="text-sm text-zinc-400">{selected.muscleGroup}</p>
            </div>
            <button
              type="button"
              className="text-zinc-500 text-sm"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Zielmuskel" value={selected.muscleGroup} />
            <InfoRow
              label="Schwierigkeit"
              value={DIFFICULTY_DE[selected.difficulty] ?? selected.difficulty}
            />
            <InfoRow
              label="Equipment"
              value={EQUIPMENT_DE[selected.equipment] ?? selected.equipment}
            />
            <InfoRow label="Genutzt" value={`${selected.popularity}×`} />
          </div>
          <Link href={`/workouts/exercises/${selected.id}`}>
            <span className="flex items-center justify-center gap-1 w-full h-11 rounded-xl bg-cyan-500/15 text-cyan-400 text-sm font-medium">
              Ausführung & Statistik
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {loading && list.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">Lädt…</p>
        )}
        {!loading && list.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">Keine Übungen gefunden</p>
        )}
        {list.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => setSelected(ex)}
            className={cn(
              "w-full flex items-center justify-between rounded-2xl px-4 py-3.5 text-left border transition-colors active:scale-[0.98]",
              selected?.id === ex.id
                ? "border-cyan-500/40 bg-cyan-500/10"
                : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
            )}
          >
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{ex.name}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {ex.muscleGroup} · {DIFFICULTY_DE[ex.difficulty] ?? ex.difficulty}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-950/50 px-3 py-2">
      <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
      <p className="text-white font-medium text-sm">{value}</p>
    </div>
  );
}
