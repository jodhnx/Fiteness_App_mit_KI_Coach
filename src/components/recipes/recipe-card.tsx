"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Clock, Heart, Flame, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FitnessRecipe } from "@/data/fitness-recipes";

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
  | "imageUrl"
>;

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
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/70 transition-colors hover:border-white/[0.14]">
      <Link href={`/rezepte/${recipe.id}`} prefetch className="block active:opacity-95">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
              <span className="text-4xl" aria-hidden>
                {recipe.emoji}
              </span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
        </div>

        <div className="space-y-2 p-3">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-white">
            {recipe.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] tabular-nums text-zinc-400">
            <span className="inline-flex items-center gap-1 text-orange-300/90">
              <Flame className="h-3 w-3" />
              {recipe.calories}
            </span>
            <span className="inline-flex items-center gap-1 text-rose-300/90">
              <Dumbbell className="h-3 w-3" />
              {recipe.proteinG}g
            </span>
            <span className="inline-flex items-center gap-1">
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
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/65 backdrop-blur-sm"
          aria-label={favorited ? "Favorit entfernen" : "Als Favorit speichern"}
        >
          <Heart
            className={cn(
              "h-4 w-4",
              favorited ? "fill-rose-500 text-rose-500" : "text-zinc-200"
            )}
          />
        </button>
      )}
    </div>
  );
});
