"use client";

import { Button } from "@/components/ui/button";
import { ONBOARDING_ACTIVITY_OPTIONS } from "@/lib/onboarding-options";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import type { ActivityLevel, NutritionGoal } from "@prisma/client";
import { Pencil } from "lucide-react";

type FormSlice = {
  name: string;
  age: string;
  weightKg: string;
  heightCm: string;
  gender: string;
  activityLevel: ActivityLevel;
  targetWeightKg: string;
  nutritionGoal: NutritionGoal;
};

function labelOrDash(value: string | number | null | undefined, suffix = "") {
  if (value === "" || value == null) return "—";
  return `${value}${suffix}`;
}

function genderLabel(g: string) {
  if (g === "MALE") return "Männlich";
  if (g === "FEMALE") return "Weiblich";
  return "—";
}

export function SettingsPersonalSummary({
  form,
  calorieTarget,
  onEdit,
}: {
  form: FormSlice;
  calorieTarget: number | null;
  onEdit: () => void;
}) {
  const activity =
    ONBOARDING_ACTIVITY_OPTIONS.find((o) => o.value === form.activityLevel)?.label ??
    form.activityLevel;

  const rows: { label: string; value: string }[] = [
    { label: "Name", value: labelOrDash(form.name.trim() || null) },
    { label: "Alter", value: labelOrDash(form.age, " Jahre") },
    { label: "Gewicht", value: labelOrDash(form.weightKg, " kg") },
    { label: "Größe", value: labelOrDash(form.heightCm, " cm") },
    { label: "Geschlecht", value: genderLabel(form.gender) },
    { label: "Aktivitätslevel", value: activity },
    { label: "Zielgewicht", value: labelOrDash(form.targetWeightKg, " kg") },
    {
      label: "Ziel",
      value: NUTRITION_GOAL_LABELS[form.nutritionGoal] ?? form.nutritionGoal,
    },
    {
      label: "Kalorienziel",
      value: calorieTarget != null && calorieTarget > 0 ? `${calorieTarget} kcal` : "—",
    },
  ];

  return (
    <div className="card-premium p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white text-lg">Persönliche Daten</h2>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Bearbeiten
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs text-zinc-500">{r.label}</dt>
            <dd className="text-sm font-medium text-white mt-0.5">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
