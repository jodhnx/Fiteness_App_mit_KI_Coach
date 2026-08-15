"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  Heart,
  Plus,
  Users,
  Gauge,
  Lightbulb,
  Sparkles,
  Flame,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import {
  getFitnessRecipe,
  recipeServingGrams,
  groupRecipeIngredients,
  recipeTotalMinutes,
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

const DIFFICULTY: Record<string, string> = {
  easy: "Einfach",
  medium: "Mittel",
  hard: "Anspruchsvoll",
};

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
    } else {
      toast.success(next ? "Zu Favoriten hinzugefügt" : "Favorit entfernt");
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

  const groups = useMemo(
    () => (recipe ? groupRecipeIngredients(recipe.ingredients ?? []) : []),
    [recipe]
  );

  if (!recipe) {
    return (
      <PageShell title="Rezept" className="pb-24">
        <p className="text-zinc-400">Rezept nicht gefunden.</p>
        <Link href="/rezepte" className="mt-4 inline-block text-sm text-accent">
          ← Zurück zu Rezepten
        </Link>
      </PageShell>
    );
  }

  const servingG = recipeServingGrams(recipe);
  const totalMin = recipeTotalMinutes(recipe);

  return (
    <PageShell className="space-y-5 pb-28" maxWidth="2xl">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/rezepte"
          prefetch
          className="inline-flex items-center gap-1 text-sm font-medium text-accent"
        >
          <ChevronLeft className="h-5 w-5" />
          Rezepte
        </Link>
        <button
          type="button"
          onClick={() => void toggleFavorite()}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/80"
          aria-label="Favorisieren"
        >
          <Heart
            className={cn(
              "h-5 w-5",
              favorited ? "fill-rose-500 text-rose-500" : "text-zinc-400"
            )}
          />
        </button>
      </div>

      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-800">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-gradient-to-br",
              recipe.accent
            )}
          >
            <span className="text-6xl" aria-hidden>
              {recipe.emoji}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent" />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {MEAL_TYPE_LABELS[recipe.mealSlot]}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
          {recipe.name}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          {recipe.description}
        </p>
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
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.l}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-white">{m.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2.5">
          <Clock className="h-4 w-4 shrink-0 text-cyan-400" />
          <div>
            <p className="text-[10px] text-zinc-500">Gesamt</p>
            <p className="text-xs font-semibold text-white">{totalMin} Min</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2.5">
          <Flame className="h-4 w-4 shrink-0 text-cyan-400" />
          <div>
            <p className="text-[10px] text-zinc-500">Kochen</p>
            <p className="text-xs font-semibold text-white">
              {recipe.cookMinutes != null ? `${recipe.cookMinutes} Min` : "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2.5">
          <Users className="h-4 w-4 shrink-0 text-cyan-400" />
          <div>
            <p className="text-[10px] text-zinc-500">Portionen</p>
            <p className="text-xs font-semibold text-white">{recipe.servings ?? 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2.5">
          <Gauge className="h-4 w-4 shrink-0 text-cyan-400" />
          <div>
            <p className="text-[10px] text-zinc-500">Level</p>
            <p className="text-xs font-semibold text-white">
              {DIFFICULTY[recipe.difficulty] ?? "—"}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs tabular-nums text-zinc-500">
        Prep {recipe.prepMinutes} Min
        {recipe.cookMinutes != null ? ` · Kochen ${recipe.cookMinutes} Min` : ""}
        {recipe.restMinutes != null ? ` · Ruhe ${recipe.restMinutes} Min` : ""}
        {recipe.ovenTempC != null ? ` · Ofen ${recipe.ovenTempC} °C` : ""}
        {` · ca. ${servingG} g`}
        {recipe.fiberG != null ? ` · Ballaststoffe ${recipe.fiberG} g` : ""}
      </p>

      {recipe.spices && recipe.spices.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-white">Gewürze</h2>
          <div className="flex flex-wrap gap-1.5">
            {recipe.spices.map((s) => (
              <span
                key={s}
                className="rounded-full border border-white/[0.08] bg-zinc-900/80 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Zutaten</h2>
        {groups.map((g) => (
          <div key={g.label} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/80">
            {g.label !== "Zutaten" && (
              <p className="border-b border-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-400/90">
                {g.label}
              </p>
            )}
            <ul className="divide-y divide-white/[0.06]">
              {g.items.map((ing) => (
                <li
                  key={ing.name + ing.amount}
                  className="flex justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="text-zinc-200">{ing.name}</span>
                  <span className="shrink-0 tabular-nums text-zinc-400">
                    {ing.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-white">Zubereitung</h2>
        <ol className="space-y-2">
          {(recipe.steps ?? []).map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-zinc-300">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {recipe.tips && recipe.tips.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Tipps
          </h2>
          <ul className="space-y-2">
            {recipe.tips.map((tip) => (
              <li
                key={tip}
                className="rounded-2xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 text-sm leading-relaxed text-zinc-300"
              >
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.variations && recipe.variations.length > 0 && (
        <section className="space-y-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Variationen
          </h2>
          <div className="space-y-2">
            {recipe.variations.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 px-4 py-3"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                  {v.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(recipe.storageNote || recipe.mealPrepNote) && (
        <section className="space-y-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-4 py-3 text-sm text-zinc-400">
          {recipe.storageNote && (
            <p>
              <span className="font-semibold text-zinc-300">Aufbewahrung: </span>
              {recipe.storageNote}
            </p>
          )}
          {recipe.mealPrepNote && (
            <p>
              <span className="font-semibold text-zinc-300">Meal Prep: </span>
              {recipe.mealPrepNote}
            </p>
          )}
        </section>
      )}

      {!pickMeal ? (
        <div className="sticky bottom-20 z-10 space-y-2">
          <Button
            type="button"
            variant="premium"
            className="h-12 w-full"
            onClick={() => setPickMeal(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Zur Ernährung hinzufügen
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => void toggleFavorite()}
          >
            <Heart
              className={cn(
                "mr-1.5 h-4 w-4",
                favorited && "fill-rose-500 text-rose-500"
              )}
            />
            {favorited ? "Favorisiert" : "Favorisieren"}
          </Button>
        </div>
      ) : (
        <div className="sticky bottom-20 z-10 space-y-2 rounded-2xl border border-accent/30 bg-zinc-900/95 p-4 shadow-xl">
          <p className="mb-2 text-sm font-medium text-white">Mahlzeit wählen</p>
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
