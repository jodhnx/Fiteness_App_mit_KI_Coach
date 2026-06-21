"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Search, Star, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useExerciseLibrarySearch, type LibraryExercise } from "@/hooks/use-exercise-library-search";
import { cn } from "@/lib/utils";

type Tab = "favorites" | "recent" | "frequent";

type ListsCache = {
  recent: LibraryExercise[];
  favorites: LibraryExercise[];
  frequent: LibraryExercise[];
  loadedAt: number;
};

let listsCache: ListsCache | null = null;
const LISTS_TTL_MS = 120_000;

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: LibraryExercise) => void;
  excludeIds?: string[];
};

function ExerciseRow({
  ex,
  disabled,
  onPick,
}: {
  ex: LibraryExercise;
  disabled?: boolean;
  onPick: (ex: LibraryExercise) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(ex)}
      className={cn(
        "w-full flex items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-transform active:scale-[0.98]",
        disabled
          ? "opacity-40 bg-zinc-900/40"
          : "bg-zinc-900/80 border border-white/5 hover:border-cyan-500/30"
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-white truncate">{ex.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {ex.muscleGroup}
          {ex.popularity > 0 ? ` · ${ex.popularity}× genutzt` : ""}
        </p>
      </div>
      {disabled && <span className="text-[10px] text-zinc-500 shrink-0 ml-2">Im Plan</span>}
    </button>
  );
}

export function ExercisePickerSheet({ open, onClose, onPick, excludeIds = [] }: Props) {
  const [tab, setTab] = useState<Tab>("favorites");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<LibraryExercise[]>(listsCache?.recent ?? []);
  const [favorites, setFavorites] = useState<LibraryExercise[]>(listsCache?.favorites ?? []);
  const [frequent, setFrequent] = useState<LibraryExercise[]>(listsCache?.frequent ?? []);

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const { exercises: searchResults, loading: searchLoading } = useExerciseLibrarySearch(
    search,
    {},
    { limit: 80, enabled: open && search.trim().length > 0, debounceMs: 50 }
  );

  const loadLists = useCallback(async () => {
    if (listsCache && Date.now() - listsCache.loadedAt < LISTS_TTL_MS) {
      setRecent(listsCache.recent);
      setFavorites(listsCache.favorites);
      setFrequent(listsCache.frequent);
      return;
    }

    try {
      const [recentRes, favRes, popRes] = await Promise.all([
        fetch("/api/exercises/recent", { credentials: "include" }),
        fetch("/api/exercises?favorites=1", { credentials: "include" }),
        fetch("/api/exercises?sort=popularity&limit=30", { credentials: "include" }),
      ]);
      const [recentData, favData, popData] = await Promise.all([
        recentRes.json(),
        favRes.json(),
        popRes.json(),
      ]);
      const nextRecent = (recentData.exercises ?? []) as LibraryExercise[];
      const nextFavorites = (favData.exercises ?? []) as LibraryExercise[];
      const nextFrequent = (popData.exercises ?? []) as LibraryExercise[];
      listsCache = {
        recent: nextRecent,
        favorites: nextFavorites,
        frequent: nextFrequent,
        loadedAt: Date.now(),
      };
      setRecent(nextRecent);
      setFavorites(nextFavorites);
      setFrequent(nextFrequent);
    } catch {
      /* keep empty */
    }
  }, []);

  useEffect(() => {
    if (open) void loadLists();
  }, [open, loadLists]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setTab("favorites");
    }
  }, [open]);

  const handlePick = useCallback(
    (ex: LibraryExercise) => {
      if (exclude.has(ex.id)) return;
      onPick(ex);
      onClose();
    },
    [exclude, onPick, onClose]
  );

  const isSearching = search.trim().length > 0;
  const list = isSearching
    ? searchResults
    : tab === "favorites"
      ? favorites
      : tab === "recent"
        ? recent
        : frequent;

  const loading = isSearching ? searchLoading : false;

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: typeof Star }[] = [
    { id: "favorites", label: "Favoriten", icon: Star },
    { id: "recent", label: "Zuletzt", icon: Clock },
    { id: "frequent", label: "Häufig", icon: TrendingUp },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300"
          aria-label="Schließen"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-white flex-1">Übung hinzufügen</h2>
      </div>

      <div className="px-4 py-3 space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Übung suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 pl-10 text-base rounded-2xl bg-zinc-900 border-zinc-800"
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {!isSearching &&
            tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap shrink-0",
                tab === t.id
                  ? "bg-cyan-500 text-zinc-950"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pb-[env(safe-area-inset-bottom)]">
          {loading && list.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">Lädt…</p>
          )}
          {!loading && list.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              {isSearching ? "Keine Treffer — anderen Begriff versuchen" : "Noch keine Einträge"}
            </p>
          )}
          {list.map((ex) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              disabled={exclude.has(ex.id)}
              onPick={handlePick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
