"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Search, Star, Clock, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useExerciseLibrarySearch, type LibraryExercise } from "@/hooks/use-exercise-library-search";
import { cn } from "@/lib/utils";

type Tab = "search" | "frequent" | "recent" | "favorites";

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
  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<LibraryExercise[]>([]);
  const [favorites, setFavorites] = useState<LibraryExercise[]>([]);
  const [frequent, setFrequent] = useState<LibraryExercise[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const { exercises: searchResults, loading: searchLoading } = useExerciseLibrarySearch(
    search,
    {},
    { limit: 80, enabled: open && tab === "search", debounceMs: 120 }
  );

  const loadLists = useCallback(async () => {
    setListsLoading(true);
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
      setRecent((recentData.exercises ?? []) as LibraryExercise[]);
      setFavorites((favData.exercises ?? []) as LibraryExercise[]);
      setFrequent((popData.exercises ?? []) as LibraryExercise[]);
    } catch {
      /* keep empty */
    } finally {
      setListsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void loadLists();
  }, [open, loadLists]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setTab("search");
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

  const list =
    tab === "search"
      ? searchResults
      : tab === "recent"
        ? recent
        : tab === "favorites"
          ? favorites
          : frequent;

  const loading = tab === "search" ? searchLoading : listsLoading;

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: typeof Search }[] = [
    { id: "search", label: "Suche", icon: Search },
    { id: "frequent", label: "Häufig", icon: TrendingUp },
    { id: "recent", label: "Zuletzt", icon: Clock },
    { id: "favorites", label: "Favoriten", icon: Star },
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
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.trim()) setTab("search");
            }}
            className="h-12 pl-10 text-base rounded-2xl bg-zinc-900 border-zinc-800"
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {tabs.map((t) => (
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
              {tab === "search" ? "Keine Treffer — anderen Begriff versuchen" : "Noch keine Einträge"}
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
