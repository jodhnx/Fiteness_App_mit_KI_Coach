"use client";

import { memo } from "react";
import { Trash2, Coffee, Sun, Moon, Cookie, Dumbbell } from "lucide-react";
import { MEAL_TYPE_LABELS } from "@/lib/nutrition";
import type { MealType } from "@prisma/client";

const ICONS: Record<string, typeof Coffee> = {
  BREAKFAST: Coffee,
  LUNCH: Sun,
  DINNER: Moon,
  SNACK: Cookie,
  PRE_WORKOUT: Dumbbell,
  POST_WORKOUT: Dumbbell,
};

type MealItemRow = {
  id: string;
  quantityG: number;
  food: { name: string };
  calories: number;
  proteinG: number;
};

type Props = {
  mealType: MealType;
  totals: { calories: number; proteinG: number };
  items: MealItemRow[];
  onRemove: (itemId: string) => void;
  expanded: boolean;
  onToggle: () => void;
};

export const MealSlot = memo(function MealSlot({
  mealType,
  totals,
  items,
  onRemove,
  expanded,
  onToggle,
}: Props) {
  const Icon = ICONS[mealType] ?? Cookie;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">{MEAL_TYPE_LABELS[mealType]}</p>
          <p className="text-sm text-zinc-500">
            {Math.round(totals.calories)} kcal · {Math.round(totals.proteinG)} g Protein
            {items.length > 0 && ` · ${items.length} Einträge`}
          </p>
        </div>
        <span className="text-cyan-400 text-sm">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && items.length > 0 && (
        <ul className="border-t border-zinc-800 px-4 py-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300 truncate flex-1">
                {item.food.name}{" "}
                <span className="text-zinc-500">({item.quantityG}g)</span>
              </span>
              <span className="text-zinc-500 mx-2">{Math.round(item.calories)} kcal</span>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-zinc-600 hover:text-red-400 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
