"use client";

import { memo } from "react";
import { Plus, Trash2, Pencil, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";

const ICONS: Record<string, typeof Coffee> = {
  BREAKFAST: Coffee,
  LUNCH: Sun,
  DINNER: Moon,
  SNACK: Cookie,
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
  totals: { calories: number; proteinG: number };
  items: MealItemRow[];
};

type Props = {
  meals: MealSlotData[];
  expandedMeal: MealType | null;
  onToggle: (mealType: MealType) => void;
  onRemove: (itemId: string) => void;
  onEdit?: (itemId: string, quantityG: number) => void;
  onDeleteMeal?: (mealId: string) => void;
  onAddClick?: (mealType: MealType) => void;
};

export const MealTrackList = memo(function MealTrackList({
  meals,
  expandedMeal,
  onToggle,
  onRemove,
  onEdit,
  onDeleteMeal,
  onAddClick,
}: Props) {
  return (
    <div className="space-y-2">
      {meals.map((slot) => {
        const Icon = ICONS[slot.mealType] ?? Cookie;
        const expanded = expandedMeal === slot.mealType;
        return (
          <div
            key={slot.mealType}
            className="rounded-2xl nutrition-glass-card overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 sm:p-4">
              <button
                type="button"
                onClick={() => onToggle(slot.mealType)}
                className="flex flex-1 items-center gap-3 text-left min-w-0"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">
                    {MEAL_TYPE_LABELS[slot.mealType]}
                  </p>
                  <p className="text-sm text-zinc-500 truncate">
                    {Math.round(slot.totals.calories)} kcal ·{" "}
                    {Math.round(slot.totals.proteinG)} g Protein
                    {slot.items.length > 0 ? ` · ${slot.items.length} Einträge` : ""}
                  </p>
                </div>
                <span className="text-zinc-500 text-sm shrink-0">
                  {expanded ? "▲" : "▼"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAddClick?.(slot.mealType)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl btn-accent active:opacity-90"
                aria-label={`+ Lebensmittel zu ${MEAL_TYPE_LABELS[slot.mealType]}`}
              >
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </button>
            </div>
            {expanded && slot.items.length > 0 && (
              <div className="border-t border-zinc-800">
                <ul className="px-4 py-2 space-y-2">
                  {slot.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-300 truncate flex-1">
                        {item.food.name}{" "}
                        <span className="text-zinc-500">({item.quantityG} g)</span>
                      </span>
                      <span className="text-zinc-500 tabular-nums shrink-0">
                        {Math.round(item.calories)} kcal
                      </span>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item.id, item.quantityG)}
                          className="text-zinc-600 hover:text-accent p-1 shrink-0"
                          aria-label="Menge bearbeiten"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-zinc-600 hover:text-red-400 p-1 shrink-0"
                        aria-label="Eintrag löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                {slot.mealId && onDeleteMeal && (
                  <div className="px-4 pb-3">
                    <button
                      type="button"
                      onClick={() => onDeleteMeal(slot.mealId!)}
                      className="text-xs text-red-400/90 hover:text-red-300"
                    >
                      Ganze Mahlzeit löschen
                    </button>
                  </div>
                )}
              </div>
            )}
            {expanded && slot.items.length === 0 && (
              <div className="border-t border-zinc-800 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onAddClick?.(slot.mealType)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 py-3 text-sm font-medium text-zinc-400 active:text-cyan-400"
                >
                  <Plus className="h-4 w-4" />
                  Lebensmittel
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
