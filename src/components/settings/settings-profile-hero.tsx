"use client";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { AvatarUpload } from "@/components/user/avatar-upload";
import { ONBOARDING_ACTIVITY_OPTIONS } from "@/lib/onboarding-options";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import type { ActivityLevel, NutritionGoal } from "@prisma/client";
import { Pencil, User } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type FormSlice = {
  name: string;
  age: string;
  weightKg: string;
  heightCm: string;
  gender: string;
  activityLevel: ActivityLevel;
  targetWeightKg: string;
  targetWeightDate: string;
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

function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d. MMM yyyy", { locale: de });
  } catch {
    return iso;
  }
}

export function SettingsProfileHero({
  form,
  userImage,
  calorieTarget,
  editing,
  onEdit,
  onImageUpdated,
}: {
  form: FormSlice;
  userImage: string | null;
  calorieTarget: number | null;
  editing: boolean;
  onEdit: () => void;
  onImageUpdated: (url: string | null) => void;
}) {
  const activity =
    ONBOARDING_ACTIVITY_OPTIONS.find((o) => o.value === form.activityLevel)?.label ??
    form.activityLevel;

  const displayName = form.name.trim() || "Dein Profil";

  const fields: { label: string; value: string }[] = [
    { label: "Alter", value: labelOrDash(form.age, " Jahre") },
    { label: "Gewicht", value: labelOrDash(form.weightKg, " kg") },
    { label: "Größe", value: labelOrDash(form.heightCm, " cm") },
    { label: "Geschlecht", value: genderLabel(form.gender) },
    { label: "Aktivitätslevel", value: activity },
    { label: "Zielgewicht", value: labelOrDash(form.targetWeightKg, " kg") },
    { label: "Zieldatum", value: formatDate(form.targetWeightDate) },
    {
      label: "Ernährungsziel",
      value: NUTRITION_GOAL_LABELS[form.nutritionGoal] ?? form.nutritionGoal,
    },
    {
      label: "Kalorienziel",
      value:
        calorieTarget != null && calorieTarget > 0 ? `${calorieTarget} kcal` : "—",
    },
  ];

  return (
    <section
      id="settings-profil"
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950 overflow-hidden"
    >
      <div className="relative px-5 pt-6 pb-5">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-violet-500/5 pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {editing ? (
            <div className="mb-4">
              <AvatarUpload
                imageUrl={userImage}
                name={form.name}
                onUpdated={onImageUpdated}
              />
            </div>
          ) : (
            <div className="mb-4 ring-4 ring-cyan-500/25 ring-offset-4 ring-offset-zinc-950 rounded-full shadow-xl shadow-cyan-500/10">
              <UserAvatar src={userImage} name={form.name} size="lg" className="!h-28 !w-28 text-3xl" />
            </div>
          )}

          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">{displayName}</h2>
          </div>
          <p className="text-sm text-zinc-500 mb-4">Persönliche Daten · immer sichtbar</p>

          {!editing && (
            <Button type="button" variant="outline" size="sm" onClick={onEdit} className="mb-5">
              <Pencil className="h-4 w-4 mr-1.5" />
              Bearbeiten
            </Button>
          )}
        </div>

        <dl className="relative grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 mt-2">
          {fields.map((r) => (
            <div
              key={r.label}
              className="rounded-xl bg-zinc-950/50 border border-white/5 px-3 py-2.5"
            >
              <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{r.label}</dt>
              <dd className="text-sm font-semibold text-white mt-1 tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
