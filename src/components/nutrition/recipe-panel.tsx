"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { FoodResult } from "./food-search-panel";

type Recipe = {
  id: string;
  name: string;
  servings: number;
  macros: { perServing: { calories: number; proteinG: number } };
};

type Props = {
  recipes: Recipe[];
  onReload: () => void;
};

export const RecipePanel = memo(function RecipePanel({ recipes, onReload }: Props) {
  const [name, setName] = useState("");
  const [foodQ, setFoodQ] = useState("");
  const [picked, setPicked] = useState<FoodResult[]>([]);
  const [options, setOptions] = useState<FoodResult[]>([]);
  const [saving, setSaving] = useState(false);

  async function search() {
    const res = await fetch(`/api/food?q=${encodeURIComponent(foodQ)}&limit=15`);
    const d = await res.json();
    setOptions(d.foods ?? []);
  }

  function addIngredient(f: FoodResult) {
    if (picked.some((p) => p.id === f.id)) return;
    setPicked([...picked, f]);
    setFoodQ("");
    setOptions([]);
  }

  async function saveRecipe() {
    if (!name || picked.length === 0) {
      toast.error("Name und mindestens eine Zutat nötig");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/nutrition/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        servings: 1,
        ingredients: picked.map((p) => ({
          foodItemId: p.id,
          quantityG: p.servingG,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Speichern fehlgeschlagen");
      return;
    }
    toast.success("Rezept gespeichert");
    setName("");
    setPicked([]);
    onReload();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <Label>Neues Rezept</Label>
        <Input
          placeholder="Rezeptname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-zinc-900"
        />
        <div className="flex gap-2">
          <Input
            placeholder="Zutat suchen…"
            value={foodQ}
            onChange={(e) => setFoodQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="bg-zinc-900 flex-1"
          />
          <Button type="button" variant="outline" onClick={search}>
            Suchen
          </Button>
        </div>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {options.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => addIngredient(f)}
                className="text-xs rounded-lg bg-zinc-800 px-2 py-1 text-zinc-300 hover:bg-cyan-500/20"
              >
                + {f.name}
              </button>
            ))}
          </div>
        )}
        {picked.length > 0 && (
          <p className="text-sm text-zinc-400">
            Zutaten: {picked.map((p) => p.name).join(", ")}
          </p>
        )}
        <Button onClick={saveRecipe} disabled={saving} className="w-full">
          Rezept speichern
        </Button>
      </div>

      {recipes.length > 0 && (
        <ul className="space-y-2">
          {recipes.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 flex justify-between"
            >
              <span className="font-medium text-white">{r.name}</span>
              <span className="text-sm text-zinc-500">
                {r.macros.perServing.calories} kcal · {r.macros.perServing.proteinG}g P
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
