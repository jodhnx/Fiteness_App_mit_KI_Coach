"use client";

import { memo } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
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
  onDeleteMeal?: (mealId: string) => void;
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

  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const emoji = MEAL_EMOJI[slot.mealType] ?? "🍽";
        const items = Array.isArray(slot.items) ? slot.items : [];
        const totals = slot.totals ?? { calories: 0, proteinG: 0 };
        const hasItems = items.length > 0;
        const kcal = Math.round(totals.calories ?? 0);
        const proteinG = Math.round(totals.proteinG ?? 0);

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
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-2xl leading-none shrink-0" aria-hidden>
                {emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  {MEAL_TYPE_LABELS[slot.mealType] ?? slot.mealType}
                </p>
                {hasItems ? (
                  <p className="text-[15px] font-semibold text-white tabular-nums mt-0.5">
                    {kcal.toLocaleString("de-DE")} kcal
                    {proteinG > 0 && (
                      <span className="text-zinc-500 font-medium text-sm">
                        {" "}· {proteinG} g P
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-[13px] text-zinc-600 mt-0.5">Noch nichts erfasst</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="inline-flex h-10 items-center gap-1.5 shrink-0 rounded-xl bg-accent/10 border border-accent/25 px-3 text-sm font-semibold text-accent active:opacity-80"
                aria-label={`Lebensmittel zu ${MEAL_TYPE_LABELS[slot.mealType] ?? "Mahlzeit"} hinzufügen`}
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span className="hidden xs:inline text-[12px]">Hinzufügen</span>
              </button>
            </div>

            {/* Item list */}
            {hasItems && (
              <ul className="border-t border-zinc-800/70 px-4 py-2 space-y-1.5">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="text-zinc-300 truncate flex-1 min-w-0">
                      {item.food?.name ?? "Lebensmittel"}
                      <span className="text-zinc-600 ml-1 text-xs">· {item.quantityG}g</span>
                    </span>
                    <span className="text-zinc-500 tabular-nums text-xs shrink-0">
                      {Math.round(item.calories)} kcal
                    </span>
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(item.id, item.quantityG)}
                        className="text-zinc-600 hover:text-zinc-300 p-1 shrink-0"
                        aria-label="Menge bearbeiten"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="text-zinc-600 hover:text-red-400 p-1 shrink-0"
                      aria-label="Eintrag löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state — subtle tap to add */}
            {!hasItems && (
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="w-full border-t border-zinc-800/50 px-4 py-2.5 text-xs text-zinc-600 hover:text-zinc-400 text-left transition-colors"
              >
                + Lebensmittel hinzufügen
              </button>
            )}

            {/* Delete meal */}
            {slot.mealId && onDeleteMeal && hasItems && (
              <div className="px-4 pb-2.5">
                <button
                  type="button"
                  onClick={() => onDeleteMeal(slot.mealId!)}
                  className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors"
                >
                  Mahlzeit leeren
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
