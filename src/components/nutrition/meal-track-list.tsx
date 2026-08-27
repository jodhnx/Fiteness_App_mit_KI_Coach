"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Pencil, MoreHorizontal } from "lucide-react";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import type { MealType } from "@prisma/client";

const MEAL_EMOJI: Record<string, string> = {
  BREAKFAST: "🍳",
  LUNCH: "🍽",
  DINNER: "🌙",
  SNACK: "🍫",
};

type MealItemRow = {
  id: string;
  quantityG: number;
  food: { name: string };
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

export const MealTrackList = memo(function MealTrackList({
  meals,
  onRemove,
  onEdit,
  onDeleteMeal,
  onAddClick,
}: Props) {
  const slots = Array.isArray(meals) ? meals : [];
  const [openMenu, setOpenMenu] = useState<MealType | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [openMenu]);

  const handleDeleteMeal = useCallback(
    (mealId: string, mealType: MealType) => {
      setOpenMenu(null);
      const label = MEAL_TYPE_LABELS[mealType] ?? mealType;
      onDeleteMeal?.(mealId, label);
    },
    [onDeleteMeal]
  );

  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const emoji = MEAL_EMOJI[slot.mealType] ?? "🍽";
        const items = Array.isArray(slot.items) ? slot.items : [];
        const totals = slot.totals ?? { calories: 0, proteinG: 0 };
        const hasItems = items.length > 0;
        const kcal = Math.round(totals.calories ?? 0);
        const proteinG = Math.round(totals.proteinG ?? 0);
        const mealLabel = MEAL_TYPE_LABELS[slot.mealType] ?? slot.mealType;

        return (
          <div
            key={slot.mealType}
            className={cn(
              "rounded-2xl border overflow-hidden",
              hasItems
                ? "border-white/[0.09] bg-zinc-900/80"
                : "border-zinc-800/60 bg-zinc-900/40"
            )}
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl leading-none shrink-0" aria-hidden>
                {emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">
                  {mealLabel}
                </p>
                {hasItems ? (
                  <>
                    <p className="text-[15px] font-semibold text-white tabular-nums mt-0.5">
                      {kcal.toLocaleString("de-DE")} kcal
                      {proteinG > 0 && (
                        <span className="text-zinc-500 font-medium text-sm">
                          {" "}
                          · {proteinG} g Protein
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {items.length} {items.length === 1 ? "Eintrag" : "Einträge"}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-zinc-400 mt-0.5">Noch nichts erfasst</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {hasItems && slot.mealId && onDeleteMeal && (
                  <div className="relative" ref={openMenu === slot.mealType ? menuRef : undefined}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenu((m) => (m === slot.mealType ? null : slot.mealType))
                      }
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white hover:bg-white/5"
                      aria-label={`Menü für ${mealLabel}`}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    {openMenu === slot.mealType && (
                      <div className="absolute right-0 top-full z-20 mt-1 min-w-[10.5rem] rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
                        <button
                          type="button"
                          className="flex w-full min-h-11 items-center gap-2 px-3 text-sm text-red-400 hover:bg-red-500/10"
                          onClick={() => handleDeleteMeal(slot.mealId!, slot.mealType)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Mahlzeit löschen
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onAddClick?.(slot.mealType)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/25 text-accent active:opacity-80"
                  aria-label={`Lebensmittel zu ${mealLabel} hinzufügen`}
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {hasItems && (
              <ul className="border-t border-zinc-800/70 px-4 py-2 space-y-1.5">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 text-sm py-1",
                      item.id.startsWith("opt-") && "opacity-70"
                    )}
                  >
                    <span className="text-zinc-300 truncate flex-1 min-w-0">
                      {item.food?.name ?? "Lebensmittel"}
                      <span className="text-zinc-500 ml-1 text-xs">· {item.quantityG}g</span>
                    </span>
                    <span className="text-zinc-400 tabular-nums text-xs shrink-0">
                      {Math.round(item.calories)} kcal
                    </span>
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(item.id, item.quantityG)}
                        className="text-zinc-400 hover:text-zinc-200 p-2 min-h-11 min-w-11 shrink-0 flex items-center justify-center"
                        aria-label="Menge bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-zinc-400 hover:text-red-400 p-2 min-h-11 min-w-11 shrink-0 flex items-center justify-center"
                      aria-label="Eintrag löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!hasItems && (
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="w-full min-h-11 border-t border-zinc-800/50 px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 text-left"
              >
                + Lebensmittel hinzufügen
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
});
