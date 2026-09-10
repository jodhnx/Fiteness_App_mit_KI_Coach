"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MEAL_TYPE_LABELS, TRACK_MEAL_ORDER } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import type { MealType } from "@prisma/client";

type MealItemRow = {
  id: string;
  quantityG: number;
  food: { name: string; brand?: string | null };
  calories: number;
  proteinG?: number;
};

type MealSlotData = {
  mealType: MealType;
  mealId?: string | null;
  totals: { calories: number; proteinG: number; carbsG?: number; fatG?: number };
  items: MealItemRow[];
};

type Props = {
  meals: MealSlotData[];
  onRemove: (itemId: string) => void;
  onEdit?: (itemId: string, quantityG: number) => void;
  onDeleteMeal?: (mealId: string, mealLabel: string) => void;
  onAddClick?: (mealType: MealType) => void;
};

const GRAM_PRESETS = [50, 100, 150, 200];

export const MealTrackList = memo(function MealTrackList({
  meals,
  onRemove,
  onEdit,
  onDeleteMeal,
  onAddClick,
}: Props) {
  const slots = TRACK_MEAL_ORDER.map((mealType) => {
    const found = (Array.isArray(meals) ? meals : []).find((m) => m.mealType === mealType);
    return (
      found ?? {
        mealType,
        mealId: null,
        totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        items: [] as MealItemRow[],
      }
    );
  });
  const [editing, setEditing] = useState<{ id: string; qty: number } | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(editing.qty));
      inputRef.current?.focus();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    if (!editing || !onEdit) {
      setEditing(null);
      return;
    }
    const next = Number(String(draft).replace(",", "."));
    if (Number.isFinite(next) && next > 0) onEdit(editing.id, next);
    setEditing(null);
  }, [draft, editing, onEdit]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
      {slots.map((slot) => {
        const items = Array.isArray(slot.items) ? slot.items : [];
        const totals = slot.totals ?? { calories: 0, proteinG: 0 };
        const hasItems = items.length > 0;
        const kcal = Math.round(totals.calories ?? 0);
        const mealLabel = MEAL_TYPE_LABELS[slot.mealType] ?? slot.mealType;

        return (
          <section
            key={slot.mealType}
            className="rounded-xl border border-white/[0.08] bg-zinc-900/70 overflow-hidden"
          >
            {hasItems ? (
              <div className="flex items-center gap-2 px-3 min-h-11">
                <h2 className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  {mealLabel}
                </h2>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {kcal.toLocaleString("de-DE")} kcal
                </p>
                {slot.mealId && onDeleteMeal && (
                  <button
                    type="button"
                    className="h-11 w-11 inline-flex items-center justify-center rounded-xl text-zinc-500 hover:text-red-400"
                    aria-label={`${mealLabel} löschen`}
                    onClick={() => onDeleteMeal(slot.mealId!, mealLabel)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div>
                <h2 className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  {mealLabel}
                </h2>
                <button
                  type="button"
                  onClick={() => onAddClick?.(slot.mealType)}
                  className="flex w-full min-h-11 items-center gap-1.5 px-3 text-sm text-zinc-300 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Essen hinzufügen
                </button>
              </div>
            )}

            {hasItems && (
              <ul className="px-3 space-y-1 pb-0.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 min-h-11",
                      item.id.startsWith("opt-") && "opacity-70"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left py-1"
                      onClick={() => onEdit && setEditing({ id: item.id, qty: item.quantityG })}
                    >
                      <p className="text-sm font-medium text-white truncate leading-tight">
                        {item.food?.name ?? "Lebensmittel"}
                      </p>
                      {item.food?.brand ? (
                        <p className="text-[11px] text-zinc-500 truncate leading-tight">
                          {item.food.brand}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-zinc-500 tabular-nums leading-tight">
                        {item.quantityG} g
                      </p>
                    </button>
                    <p className="text-xs text-zinc-400 tabular-nums shrink-0">
                      {Math.round(item.calories)} kcal
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="h-11 w-11 inline-flex items-center justify-center text-zinc-500 hover:text-red-400 shrink-0"
                      aria-label="Eintrag löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {editing && items.some((i) => i.id === editing.id) && (
              <div className="px-3.5 pb-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="decimal"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.replace(/[^0-9.,]/g, ""))}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit();
                      }
                    }}
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-zinc-950 px-3 text-base text-white tabular-nums"
                    aria-label="Menge in Gramm"
                  />
                  <span className="text-xs font-semibold text-zinc-500">g</span>
                </div>
                <div className="flex gap-1.5">
                  {GRAM_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className="h-11 flex-1 rounded-xl border border-white/10 text-xs font-medium text-zinc-300"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDraft(String(g));
                        if (onEdit && editing) onEdit(editing.id, g);
                        setEditing(null);
                      }}
                    >
                      {g} g
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasItems && (
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="flex w-full min-h-11 items-center gap-2 px-3 text-sm text-zinc-300 hover:text-white border-t border-white/[0.06]"
              >
                <Plus className="h-4 w-4" />
                Essen hinzufügen
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
});
