"use client";

import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RECIPE_FILTER_GROUPS,
  RECIPE_FILTERS,
  RECIPE_MORE_FILTERS,
  RECIPE_PRIMARY_FILTERS,
} from "@/data/fitness-recipes";
import { hapticTap } from "@/lib/haptic";

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold min-h-9",
        active
          ? "border-accent bg-accent text-white"
          : "border-zinc-200 bg-white text-zinc-600 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/80 dark:text-zinc-400"
      )}
    >
      {label}
    </button>
  );
}

const filterById = new Map(RECIPE_FILTERS.map((f) => [f.id, f]));

export function RecipeFilterBar({
  filters,
  onToggle,
  onClear,
  moreOpen,
  onToggleMore,
}: {
  filters: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  moreOpen: boolean;
  onToggleMore: () => void;
}) {
  const activeCount = filters.length;
  const primaryIds = new Set(RECIPE_PRIMARY_FILTERS.map((f) => f.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="scrollbar-none -mx-0.5 flex flex-1 gap-1.5 overflow-x-auto px-0.5 pb-0.5">
          <Chip
            active={activeCount === 0}
            label="Alle"
            onClick={() => {
              hapticTap();
              onClear();
            }}
          />
          {RECIPE_PRIMARY_FILTERS.map((f) => (
            <Chip
              key={f.id}
              active={filters.includes(f.id)}
              label={f.label}
              onClick={() => onToggle(f.id)}
            />
          ))}
        </div>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              hapticTap();
              onClear();
            }}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-600 dark:border-white/[0.08] dark:bg-zinc-900/80 dark:text-zinc-400"
          >
            <X className="h-3 w-3" />
            Reset
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
              {activeCount}
            </span>
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          hapticTap();
          onToggleMore();
        }}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 text-[11px] font-semibold text-zinc-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400"
      >
        Mehr Filter
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")}
        />
        {filters.some((id) => !primaryIds.has(id)) ? (
          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">
            +
          </span>
        ) : null}
      </button>

      {moreOpen ? (
        <div className="space-y-2 rounded-xl border border-zinc-200/90 bg-white p-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
          {RECIPE_FILTER_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.filterIds.map((id) => {
                  const f = filterById.get(id);
                  if (!f) return null;
                  return (
                    <Chip
                      key={f.id}
                      active={filters.includes(f.id)}
                      label={f.label}
                      onClick={() => onToggle(f.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          {RECIPE_MORE_FILTERS.length > 0 ? (
            <div className="space-y-1 border-t border-zinc-100 pt-2 dark:border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                Weitere
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RECIPE_MORE_FILTERS.map((f) => (
                  <Chip
                    key={f.id}
                    active={filters.includes(f.id)}
                    label={f.label}
                    onClick={() => onToggle(f.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
