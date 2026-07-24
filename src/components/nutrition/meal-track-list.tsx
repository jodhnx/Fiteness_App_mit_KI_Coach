"use client";

import { memo } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
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
  return (
    <div className="space-y-2">
      {meals.map((slot) => {
        const emoji = MEAL_EMOJI[slot.mealType] ?? "🍽";
        return (
          <div
            key={slot.mealType}
            className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl leading-none shrink-0" aria-hidden>
                {emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-[15px]">
                  {MEAL_TYPE_LABELS[slot.mealType]}
                </p>
                <p className="text-xs text-zinc-500 tabular-nums mt-0.5">
                  {Math.round(slot.totals.calories)} kcal
                  {slot.totals.proteinG > 0 && ` · P ${Math.round(slot.totals.proteinG)}g`}
                  {(slot.totals.carbsG ?? 0) > 0 && ` · KH ${Math.round(slot.totals.carbsG!)}g`}
                  {(slot.totals.fatG ?? 0) > 0 && ` · F ${Math.round(slot.totals.fatG!)}g`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white active:opacity-90"
                aria-label={`Lebensmittel zu ${MEAL_TYPE_LABELS[slot.mealType]} hinzufügen`}
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>

            {slot.items.length > 0 && (
              <ul className="border-t border-zinc-800/80 px-4 py-2 space-y-1.5">
                {slot.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm py-1">
                    <span className="text-zinc-300 truncate flex-1 min-w-0">
                      {item.food.name}
                      <span className="text-zinc-600 ml-1">· {item.quantityG}g</span>
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

            {slot.items.length === 0 && (
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="w-full border-t border-zinc-800/80 px-4 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 text-left"
              >
                + Lebensmittel hinzufügen
              </button>
            )}

            {slot.mealId && onDeleteMeal && slot.items.length > 0 && (
              <div className="px-4 pb-2">
                <button
                  type="button"
                  onClick={() => onDeleteMeal(slot.mealId!)}
                  className="text-[11px] text-zinc-600 hover:text-red-400"
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
