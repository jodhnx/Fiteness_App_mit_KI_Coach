"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Heart,
  Plus,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  getFitnessRecipe,
  recipeServingGrams,
} from "@/data/fitness-recipes";
import { MEAL_TYPE_LABELS, TRACK_MEAL_ORDER } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { hapticTap } from "@/lib/haptic";
import { getCached, setCached } from "@/lib/client-cache";
import { publishNutritionDashboard } from "@/lib/nutrition-sync";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { MealType } from "@prisma/client";

const FAV_CACHE = "recipe-catalog-favorites";

export default function RezeptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const recipe = getFitnessRecipe(id);

  const [favorited, setFavorited] = useState(() =>
    (getCached<string[]>(FAV_CACHE) ?? []).includes(id)
  );
  const [adding, setAdding] = useState(false);
  const [pickMeal, setPickMeal] = useState(false);

  useEffect(() => {
    void fetch("/api/recipes/catalog", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.favoriteIds) return;
        setCached(FAV_CACHE, d.favoriteIds, 180_000);
        setFavorited(d.favoriteIds.includes(id));
      })
      .catch(() => undefined);
  }, [id]);

  const toggleFavorite = useCallback(async () => {
    hapticTap();
    const next = !favorited;
    setFavorited(next);
    const prev = getCached<string[]>(FAV_CACHE) ?? [];
    const ids = next
      ? [id, ...prev.filter((x) => x !== id)]
      : prev.filter((x) => x !== id);
    setCached(FAV_CACHE, ids, 180_000);

    const res = await fetch("/api/recipes/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: id }),
    });
    if (!res.ok) {
      setFavorited(!next);
      setCached(FAV_CACHE, prev, 180_000);
      toast.error("Favorit konnte nicht gespeichert werden");
    }
  }, [favorited, id]);

  const logToMeal = useCallback(
    async (mealType: MealType) => {
      if (!recipe || adding) return;
      setAdding(true);
      hapticTap();
      try {
        const res = await fetch("/api/recipes/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipeId: recipe.id, mealType }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error ?? "Hinzufügen fehlgeschlagen");
          return;
        }
        if (data.dashboard) {
          publishNutritionDashboard(data.dashboard as NutritionDashboardPayload);
        }
        toast.success(
          `${recipe.name} zu ${MEAL_TYPE_LABELS[mealType]} hinzugefügt`
        );
        setPickMeal(false);
        router.push("/nutrition");
      } catch {
        toast.error("Netzwerkfehler");
      } finally {
        setAdding(false);
      }
    },
    [recipe, adding, router]
  );

  if (!recipe) {
    return (
      <PageShell title="Rezept" className="pb-24">
        <p className="text-zinc-400">Rezept nicht gefunden.</p>
        <Link href="/rezepte" className="text-accent text-sm mt-4 inline-block">
          ← Zurück zu Rezepten
        </Link>
      </PageShell>
    );
  }

  const servingG = recipeServingGrams(recipe);

  return (
    <PageShell
      title={recipe.name}
      className="pb-28 space-y-5"
      maxWidth="2xl"
      action={
        <button
          type="button"
          onClick={() => void toggleFavorite()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700"
          aria-label="Favorit"
        >
          <Heart
            className={cn(
              "h-5 w-5",
              favorited ? "fill-rose-500 text-rose-500" : "text-zinc-400"
            )}
          />
        </button>
      }
    >
      <Link
        href="/rezepte"
        prefetch
        className="inline-flex items-center gap-1 text-sm font-medium text-accent -mt-2"
      >
        <ChevronLeft className="h-5 w-5" />
        Rezepte
      </Link>

      <div
        className={cn(
          "rounded-3xl h-40 flex items-center justify-center bg-gradient-to-br border border-white/[0.08]",
          recipe.accent
        )}
      >
        <span className="text-6xl" aria-hidden>
          {recipe.emoji}
        </span>
      </div>

      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide">
          {MEAL_TYPE_LABELS[recipe.mealSlot]}
        </p>
        <h1 className="text-2xl font-bold text-white mt-1">{recipe.name}</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{recipe.description}</p>
        <p className="flex items-center gap-1.5 text-sm text-zinc-400 mt-3 flex-wrap">
          <Clock className="h-4 w-4" />
          {recipe.prepMinutes ?? "—"} Min · {recipe.servings ?? 1} Portion
          {(recipe.servings ?? 1) !== 1 ? "en" : ""} ·{" "}
          {recipe.difficulty === "easy"
            ? "Einfach"
            : recipe.difficulty === "medium"
              ? "Mittel"
              : recipe.difficulty === "hard"
                ? "Anspruchsvoll"
                : "—"}
          · {servingG} g
        </p>
        {recipe.source && (
          <p className="text-xs text-zinc-500 mt-2">
            Quelle:{" "}
            {recipe.source.url ? (
              <a
                href={recipe.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                {recipe.source.name}
              </a>
            ) : (
              recipe.source.name
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { l: "kcal", v: recipe.calories },
          { l: "Protein", v: `${recipe.proteinG}g` },
          { l: "KH", v: `${recipe.carbsG}g` },
          { l: "Fett", v: `${recipe.fatG}g` },
        ].map((m) => (
          <div
            key={m.l}
            className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 px-2 py-3 text-center"
          >
            <p className="text-[10px] text-zinc-500 uppercase">{m.l}</p>
            <p className="text-sm font-bold text-white tabular-nums mt-1">{m.v}</p>
          </div>
        ))}
      </div>
      {recipe.fiberG != null && (
        <p className="text-xs text-zinc-500 tabular-nums -mt-2">
          Ballaststoffe: {recipe.fiberG} g
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Zutaten</h2>
        <ul className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 divide-y divide-white/[0.06]">
          {(recipe.ingredients ?? []).map((ing) => (
            <li
              key={ing.name + ing.amount}
              className="flex justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="text-zinc-200">{ing.name}</span>
              <span className="text-zinc-400 tabular-nums shrink-0">{ing.amount}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Zubereitung</h2>
        <ol className="space-y-2">
          {(recipe.steps ?? []).map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-xs font-bold">
                {i + 1}
              </span>
              <p className="text-sm text-zinc-300 leading-relaxed pt-0.5">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {!pickMeal ? (
        <Button
          type="button"
          variant="premium"
          className="w-full h-12 sticky bottom-20 z-10"
          onClick={() => setPickMeal(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Zur Ernährung hinzufügen
        </Button>
      ) : (
        <div className="rounded-2xl border border-accent/30 bg-zinc-900/95 p-4 space-y-2 sticky bottom-20 z-10 shadow-xl">
          <p className="text-sm font-medium text-white mb-2">Mahlzeit wählen</p>
          <div className="grid grid-cols-2 gap-2">
            {TRACK_MEAL_ORDER.map((m) => (
              <Button
                key={m}
                type="button"
                variant="outline"
                disabled={adding}
                className="h-11"
                onClick={() => void logToMeal(m)}
              >
                {MEAL_TYPE_LABELS[m]}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setPickMeal(false)}
            disabled={adding}
          >
            Abbrechen
          </Button>
        </div>
      )}
    </PageShell>
  );
}
