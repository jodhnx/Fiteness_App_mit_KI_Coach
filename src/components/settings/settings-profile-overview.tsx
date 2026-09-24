"use client";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { ONBOARDING_ACTIVITY_OPTIONS, ONBOARDING_MAIN_GOAL_UI } from "@/lib/onboarding-options";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import type { ActivityLevel, NutritionGoal, TrainingGoal } from "@prisma/client";
import { GENDER_LABELS } from "@/lib/profile-labels";

export type SettingsProfileOverviewForm = {
  name: string;
  username: string;
  email: string;
  age: string;
  weightKg: string;
  heightCm: string;
  gender: string;
  activityLevel: ActivityLevel;
  nutritionGoal: NutritionGoal;
  trainingGoal: TrainingGoal;
  calorieTarget: string;
  proteinTargetG: string;
  carbsTargetG: string;
  fatTargetG: string;
};

function dash(value: string | number | null | undefined, suffix = "") {
  if (value === "" || value == null) return "—";
  return `${value}${suffix}`;
}

function formatKcal(raw: number | null | string | undefined): string {
  if (raw == null || raw === "") return "—";
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("de-DE")} kcal`;
}

function formatGrams(raw: string | number | null | undefined): string {
  if (raw === "" || raw == null) return "—";
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("de-DE")} g`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-10 py-2.5 border-b border-zinc-100 last:border-0 dark:border-white/[0.06]">
      <dt className="text-[14px] font-medium text-zinc-900 shrink-0 dark:text-white">{label}</dt>
      <dd className="text-[14px] text-zinc-500 text-right tabular-nums truncate dark:text-[#8e8e93]">
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
    <section className="space-y-1.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 px-0.5">
        {title}
      </h3>
      <dl className="rounded-[1rem] border border-zinc-200/90 bg-white px-3.5 shadow-sm dark:border-white/[0.07] dark:bg-[#1a1a21] dark:shadow-none">
        {children}
      </dl>
    </section>
  );
}

/** Premium first-screen profile + goals — values visible at a glance. */
export function SettingsProfileOverview({
  form,
  userImage,
  calorieTarget,
  onEdit,
}: {
  form: SettingsProfileOverviewForm;
  userImage: string | null;
  calorieTarget: number | null;
  onEdit: () => void;
}) {
  const activity =
    ONBOARDING_ACTIVITY_OPTIONS.find((o) => o.value === form.activityLevel)?.label ??
    form.activityLevel;
  const goal =
    NUTRITION_GOAL_LABELS[form.nutritionGoal] ??
    ONBOARDING_MAIN_GOAL_UI.find((o) => o.trainingGoal === form.trainingGoal)?.label ??
    form.nutritionGoal;
  const displayName = form.name.trim() || "Dein Profil";
  const kcal =
    calorieTarget != null && calorieTarget > 0
      ? calorieTarget
      : form.calorieTarget
        ? Number(String(form.calorieTarget).replace(",", "."))
        : null;

  return (
    <section id="settings-profil" className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar
          src={userImage}
          name={form.name}
          size="md"
          className="!h-12 !w-12 text-sm shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold text-zinc-900 tracking-tight truncate dark:text-white">
            {displayName}
          </h2>
          {form.username ? (
            <p className="text-[13px] text-zinc-500 truncate">@{form.username}</p>
          ) : form.email ? (
            <p className="text-xs text-zinc-500 truncate">{form.email}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="shrink-0 min-h-9 h-9 rounded-full px-3.5 text-[13px] dark:border-white/10 dark:bg-white/[0.04]"
        >
          Bearbeiten
        </Button>
      </div>

      <Section title="Profil">
        <Row label="Alter" value={dash(form.age, " Jahre")} />
        <Row label="Größe" value={dash(form.heightCm, " cm")} />
        <Row label="Gewicht" value={dash(form.weightKg, " kg")} />
        <Row
          label="Geschlecht"
          value={GENDER_LABELS[form.gender as keyof typeof GENDER_LABELS] ?? "—"}
        />
        <Row label="Aktivitätslevel" value={activity} />
      </Section>

      <Section title="Ziel">
        <Row label="Ziel" value={goal} />
        <Row label="Kalorien" value={formatKcal(kcal)} />
        <Row label="Protein" value={formatGrams(form.proteinTargetG)} />
        <Row label="Carbs" value={formatGrams(form.carbsTargetG)} />
        <Row label="Fett" value={formatGrams(form.fatTargetG)} />
      </Section>
    </section>
  );
}

/** @deprecated Use SettingsProfileOverview — kept for deep-link edit pages */
export { SettingsProfileOverview as SettingsProfileHero };
