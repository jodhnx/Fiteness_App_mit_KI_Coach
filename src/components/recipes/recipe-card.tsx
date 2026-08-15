"use client";

import { memo } from "react";
import Link from "next/link";
import { Clock, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FitnessRecipe } from "@/data/fitness-recipes";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";

type CardRecipe = Pick<
  FitnessRecipe,
  | "id"
  | "name"
  | "mealSlot"
  | "prepMinutes"
  | "calories"
  | "proteinG"
  | "emoji"
  | "accent"
>;

export const RecipeCard = memo(function RecipeCard({
  recipe,
  favorited,
  onToggleFavorite,
}: {
  recipe: CardRecipe;
  favorited: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden">
      <Link href={`/rezepte/${recipe.id}`} prefetch className="block active:opacity-90">
        <div
          className={cn(
            "h-24 flex items-center justify-center bg-gradient-to-br",
            recipe.accent
          )}
        >
          <span className="text-4xl" aria-hidden>
            {recipe.emoji}
          </span>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="font-semibold text-white text-sm leading-snug line-clamp-2">
            {recipe.name}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
            {MEAL_TYPE_LABELS[recipe.mealSlot]}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 tabular-nums">
            <span>{recipe.calories} kcal</span>
            <span className="text-zinc-600">·</span>
            <span className="text-rose-400/90">P {recipe.proteinG}g</span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {recipe.prepMinutes} Min
            </span>
          </div>
        </div>
      </Link>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(recipe.id);
          }}
          className="absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950/70 border border-white/10"
          aria-label={favorited ? "Favorit entfernen" : "Als Favorit speichern"}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              favorited ? "fill-rose-500 text-rose-500" : "text-zinc-400"
            )}
          />
        </button>
      )}
    </div>
  );
});
