"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Heart, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FitnessRecipe } from "@/data/fitness-recipes";

type CardRecipe = Pick<
  FitnessRecipe,
  | "id"
  | "name"
  | "mealSlot"
  | "tags"
  | "prepMinutes"
  | "cookMinutes"
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "emoji"
  | "accent"
  | "imageUrl"
>;

const SLOT_LABEL: Record<string, string> = {
  BREAKFAST: "Frühstück",
  LUNCH: "Mittag",
  DINNER: "Abend",
  SNACK: "Snack",
};

function tagLabel(recipe: CardRecipe): string {
  if (recipe.tags.includes("high-protein")) return "High Protein";
  if (recipe.tags.includes("low-calorie")) return "Low Calorie";
  if (recipe.tags.includes("austrian")) return "Österreichisch";
  if (recipe.tags.includes("meal-prep")) return "Meal Prep";
  if (recipe.tags.includes("vegan")) return "Vegan";
  return SLOT_LABEL[recipe.mealSlot] ?? "Rezept";
}

export const RecipeCard = memo(function RecipeCard({
  recipe,
  favorited,
  onToggleFavorite,
  priority = false,
}: {
  recipe: CardRecipe;
  favorited: boolean;
  onToggleFavorite?: (id: string) => void;
  priority?: boolean;
}) {
  const timeMin =
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || recipe.prepMinutes;
  const meta = `${tagLabel(recipe)} · ${SLOT_LABEL[recipe.mealSlot] ?? ""}`;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm transition-colors hover:border-zinc-300 dark:border-white/[0.08] dark:bg-zinc-900/70 dark:shadow-none dark:hover:border-white/[0.14]">
      <Link href={`/rezepte/${recipe.id}`} prefetch className="block active:opacity-95">
        <div className="relative aspect-[5/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
                recipe.accent
              )}
            >
              <span className="text-3xl" aria-hidden>
                {recipe.emoji}
              </span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent dark:from-zinc-950/80" />
        </div>

        <div className="space-y-1.5 p-2.5">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-zinc-900 dark:text-white">
            {recipe.name}
          </p>
          <p className="truncate text-[10px] font-medium text-zinc-500">
            {meta}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-0.5 font-semibold text-orange-600 dark:text-orange-300/90">
              <Flame className="h-3 w-3" />
              {recipe.calories} kcal
            </span>
            <span>P {recipe.proteinG}g</span>
            <span>C {recipe.carbsG}g</span>
            <span>F {recipe.fatG}g</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {timeMin} min
            </span>
          </div>
          <span className="inline-flex min-h-8 items-center text-[11px] font-semibold text-accent">
            Ansehen
          </span>
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(recipe.id);
          }}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-950/65"
          aria-label={favorited ? "Favorit entfernen" : "Als Favorit speichern"}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              favorited
                ? "fill-rose-500 text-rose-500"
                : "text-zinc-500 dark:text-zinc-200"
            )}
          />
        </button>
      )}
    </div>
  );
});
