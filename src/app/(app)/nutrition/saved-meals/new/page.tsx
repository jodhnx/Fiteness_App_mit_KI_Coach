"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FullscreenPage } from "@/components/ui/fullscreen-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { invalidateSavedMealsCache } from "@/lib/saved-meals-cache";

type Ingredient = { foodItemId: string; name: string; quantityG: number };

export default function NewSavedMealPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [foodId, setFoodId] = useState("");
  const [foodName, setFoodName] = useState("");
  const [grams, setGrams] = useState("100");
  const [saving, setSaving] = useState(false);

  function addIngredient() {
    if (!foodId.trim() || !foodName.trim()) {
      toast.error("Lebensmittel-ID und Name nötig (aus Suche übernehmen)");
      return;
    }
    const g = parseFloat(grams);
    if (!g || g <= 0) return;
    setIngredients((list) => [
      ...list,
      { foodItemId: foodId.trim(), name: foodName.trim(), quantityG: g },
    ]);
    setFoodId("");
    setFoodName("");
    setGrams("100");
  }

  async function save() {
    if (!name.trim() || ingredients.length === 0) {
      toast.error("Name und mindestens eine Zutat nötig");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/nutrition/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        servings: 1,
        isMealTemplate: true,
        ingredients: ingredients.map((i) => ({
          foodItemId: i.foodItemId,
          quantityG: i.quantityG,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Speichern fehlgeschlagen");
      return;
    }
    toast.success("Mahlzeit gespeichert");
    invalidateSavedMealsCache();
    router.back();
  }

  return (
    <FullscreenPage title="Eigene Mahlzeit" subtitle="Für 1-Klick-Tracking">
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        <div>
          <Label>Name</Label>
          <Input
            className="mt-1 h-12"
            placeholder='z. B. "Mein Frühstück"'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="card-premium p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-400">Zutat hinzufügen</p>
          <Input
            placeholder="Food Item ID (aus Lebensmittel-Suche)"
            value={foodId}
            onChange={(e) => setFoodId(e.target.value)}
          />
          <Input
            placeholder="Anzeigename"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Gramm"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
          />
          <Button variant="secondary" className="w-full" onClick={addIngredient}>
            Zur Liste
          </Button>
        </div>
        {ingredients.length > 0 && (
          <ul className="space-y-2">
            {ingredients.map((i, idx) => (
              <li key={idx} className="card-premium px-3 py-2 text-sm text-zinc-300">
                {i.name} — {i.quantityG} g
              </li>
            ))}
          </ul>
        )}
        <Button className="w-full h-12" disabled={saving} onClick={save}>
          Mahlzeit speichern
        </Button>
      </div>
    </FullscreenPage>
  );
}
