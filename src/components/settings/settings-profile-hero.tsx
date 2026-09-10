"use client";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { AvatarUpload } from "@/components/user/avatar-upload";
import { ONBOARDING_ACTIVITY_OPTIONS, ONBOARDING_EXPERIENCE_OPTIONS, ONBOARDING_MAIN_GOAL_UI } from "@/lib/onboarding-options";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import type { ActivityLevel, NutritionGoal, PlanLevel, TrainingGoal } from "@prisma/client";
import { Pencil } from "lucide-react";
import { GENDER_LABELS, TRAINING_LOCATION_LABELS } from "@/lib/profile-labels";

type FormSlice = {
  name: string;
  username: string;
  email: string;
  age: string;
  weightKg: string;
  heightCm: string;
  gender: string;
  activityLevel: ActivityLevel;
  targetWeightKg: string;
  nutritionGoal: NutritionGoal;
  trainingGoal: TrainingGoal;
  experienceLevel: PlanLevel;
  workoutDaysPerWeek: string;
  trainingLocation: string;
  calorieTarget: string;
  proteinTargetG: string;
  carbsTargetG: string;
  fatTargetG: string;
  waterTargetMl: string;
};

function dash(value: string | number | null | undefined, suffix = "") {
  if (value === "" || value == null) return "—";
  return `${value}${suffix}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 min-h-9 py-1.5 border-b border-white/[0.04] last:border-0">
      <dt className="text-xs text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-white text-right tabular-nums truncate">
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 px-0.5">
        {title}
      </h3>
      <dl className="rounded-2xl border border-white/[0.06] bg-zinc-900/35 px-3.5 py-1">
        {children}
      </dl>
    </section>
  );
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
  const goal =
    ONBOARDING_MAIN_GOAL_UI.find((o) => o.trainingGoal === form.trainingGoal)?.label ??
    form.trainingGoal;
  const experience =
    ONBOARDING_EXPERIENCE_OPTIONS.find((o) => o.value === form.experienceLevel)?.label ??
    form.experienceLevel;
  const displayName = form.name.trim() || "Dein Profil";
  const kcal =
    calorieTarget != null && calorieTarget > 0
      ? calorieTarget
      : form.calorieTarget
        ? Number(form.calorieTarget)
        : null;

  return (
    <section id="settings-profil" className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-3.5">
        {editing ? (
          <AvatarUpload
            imageUrl={userImage}
            name={form.name}
            onUpdated={onImageUpdated}
          />
        ) : (
          <UserAvatar
            src={userImage}
            name={form.name}
            size="lg"
            className="!h-16 !w-16 text-xl shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-white tracking-tight truncate">
            {displayName}
          </h2>
          {form.username ? (
            <p className="text-sm text-zinc-400 truncate">@{form.username}</p>
          ) : null}
          {form.email ? (
            <p className="text-xs text-zinc-500 truncate mt-0.5">{form.email}</p>
          ) : null}
        </div>
        {!editing && (
          <Button type="button" variant="outline" size="sm" onClick={onEdit} className="shrink-0">
            <Pencil className="h-4 w-4 mr-1.5" />
            Bearbeiten
          </Button>
        )}
      </div>

      {!editing && (
        <div className="space-y-3">
          <Section title="Körper">
            <Row label="Alter" value={dash(form.age, " Jahre")} />
            <Row
              label="Geschlecht"
              value={GENDER_LABELS[form.gender as keyof typeof GENDER_LABELS] ?? "—"}
            />
            <Row label="Größe" value={dash(form.heightCm, " cm")} />
            <Row label="Gewicht" value={dash(form.weightKg, " kg")} />
            <Row label="Zielgewicht" value={dash(form.targetWeightKg, " kg")} />
          </Section>

          <Section title="Ziele">
            <Row label="Ziel" value={goal} />
            <Row label="Aktivität" value={activity} />
            <Row label="Trainingstage" value={dash(form.workoutDaysPerWeek, " / Woche")} />
            <Row label="Erfahrung" value={experience} />
            <Row
              label="Ort"
              value={
                TRAINING_LOCATION_LABELS[
                  form.trainingLocation as keyof typeof TRAINING_LOCATION_LABELS
                ] ?? form.trainingLocation
              }
            />
            <Row
              label="Ernährung"
              value={NUTRITION_GOAL_LABELS[form.nutritionGoal] ?? form.nutritionGoal}
            />
          </Section>

          <Section title="Ernährung">
            <Row
              label="Kalorienziel"
              value={kcal != null && kcal > 0 ? `${kcal} kcal` : "—"}
            />
            <Row label="Protein" value={dash(form.proteinTargetG, " g")} />
            <Row label="Carbs" value={dash(form.carbsTargetG, " g")} />
            <Row label="Fett" value={dash(form.fatTargetG, " g")} />
            <Row
              label="Wasser"
              value={
                form.waterTargetMl
                  ? `${(Number(form.waterTargetMl) / 1000).toFixed(1).replace(".", ",")} L`
                  : "—"
              }
            />
          </Section>
        </div>
      )}
    </section>
  );
}
