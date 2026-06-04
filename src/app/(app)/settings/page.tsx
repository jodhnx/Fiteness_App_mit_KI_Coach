"use client";

import { useEffect, useMemo, useState } from "react";
import { previewTargetsFromForm } from "@/lib/calorie-target";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import {
  ONBOARDING_ACTIVITY_OPTIONS,
  ONBOARDING_NUTRITION_GOAL_OPTIONS,
  ONBOARDING_MAIN_GOAL_UI,
  ONBOARDING_TRAINING_DAYS,
  ONBOARDING_EXPERIENCE_OPTIONS,
} from "@/lib/onboarding-options";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import type { ActivityLevel, NutritionGoal, PlanLevel, TrainingGoal } from "@prisma/client";
import { invalidateAllNutritionCaches, PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import { useSession } from "next-auth/react";
import { AvatarUpload } from "@/components/user/avatar-upload";
import { usePreferences } from "@/components/providers/preferences-provider";
import { APP_THEMES, UI_DENSITY_OPTIONS, COLOR_MODE_OPTIONS } from "@/lib/themes";
import {
  SettingsCategoryNav,
  type SettingsCategoryId,
} from "@/components/settings/settings-category-nav";
import { cn } from "@/lib/utils";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { getCached, setCached } from "@/lib/client-cache";

type CalcPreview = {
  bmi: number;
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  recommendedTrainingDays: number;
};

type ProfileApiResponse = {
  user?: { name?: string; image?: string | null };
  profile?: Record<string, unknown>;
  calculations?: CalcPreview;
  smartGoal?: { weightProjection?: string };
};

function applyProfileToForm(d: ProfileApiResponse) {
  const p = d.profile as Record<string, unknown> | undefined;
  return {
    name: d.user?.name ?? "",
    age: p?.age?.toString() ?? "",
    weightKg: p?.weightKg?.toString() ?? "",
    heightCm: p?.heightCm?.toString() ?? "",
    gender: (p?.gender as string) ?? "MALE",
    activityLevel: (p?.activityLevel as ActivityLevel) ?? "MODERATE",
    trainingGoal: (p?.trainingGoal as TrainingGoal) ?? "GENERAL_FITNESS",
    nutritionGoal: (p?.nutritionGoal as NutritionGoal) ?? "MAINTENANCE",
    experienceLevel: (p?.experienceLevel as PlanLevel) ?? "BEGINNER",
    workoutDaysPerWeek: p?.workoutDaysPerWeek?.toString() ?? "3",
    calorieTarget: "",
    proteinTargetG: "",
    carbsTargetG: "",
    fatTargetG: "",
    waterTargetMl: p?.waterTargetMl?.toString() ?? "2500",
    targetWeightKg: p?.targetWeightKg?.toString() ?? "",
    targetWeightDate: p?.targetWeightDate
      ? String(p.targetWeightDate).slice(0, 10)
      : "",
    bodyFatPct: p?.bodyFatPct?.toString() ?? "",
    muscleMassKg: p?.muscleMassKg?.toString() ?? "",
    neckCm: p?.neckCm?.toString() ?? "",
    chestCm: p?.chestCm?.toString() ?? "",
    waistCm: p?.waistCm?.toString() ?? "",
    hipsCm: p?.hipsCm?.toString() ?? "",
  };
}

export default function SettingsPage() {
  const { theme, uiDensity, colorMode, setTheme, setUiDensity, setColorMode } =
    usePreferences();
  const [category, setCategory] = useState<SettingsCategoryId>("ziele");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<CalcPreview | null>(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    weightKg: "",
    heightCm: "",
    gender: "MALE",
    activityLevel: "MODERATE" as ActivityLevel,
    trainingGoal: "GENERAL_FITNESS" as TrainingGoal,
    nutritionGoal: "MAINTENANCE" as NutritionGoal,
    experienceLevel: "BEGINNER" as PlanLevel,
    workoutDaysPerWeek: "3",
    calorieTarget: "",
    proteinTargetG: "",
    carbsTargetG: "",
    fatTargetG: "",
    waterTargetMl: "2500",
    targetWeightKg: "",
    targetWeightDate: "",
    bodyFatPct: "",
    muscleMassKg: "",
    neckCm: "",
    chestCm: "",
    waistCm: "",
    hipsCm: "",
  });
  const { update: updateSession } = useSession();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [smartGoalHint, setSmartGoalHint] = useState<string | null>(null);

  const { data: profileData, loading } = useCachedFetch<ProfileApiResponse>(
    PROFILE_CACHE_KEY,
    "/api/profile",
    120_000,
    6_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  useEffect(() => {
    if (!profileData) return;
    setForm(applyProfileToForm(profileData));
    if (profileData.calculations) setPreview(profileData.calculations);
    if (profileData.smartGoal?.weightProjection) {
      setSmartGoalHint(profileData.smartGoal.weightProjection);
    }
    setUserImage(profileData.user?.image ?? null);
  }, [profileData]);

  const livePreview = useMemo(() => previewTargetsFromForm(form), [form]);

  useEffect(() => {
    if (!livePreview) return;
    setPreview({
      bmi: livePreview.bmi,
      calorieTarget: livePreview.calorieTarget,
      proteinTargetG: livePreview.proteinTargetG,
      carbsTargetG: livePreview.carbsTargetG,
      fatTargetG: livePreview.fatTargetG,
      recommendedTrainingDays: livePreview.recommendedTrainingDays,
    });
  }, [livePreview]);

  async function save() {
    setSaving(true);
    const manualMacros = Boolean(
      form.calorieTarget.trim() ||
        form.proteinTargetG.trim() ||
        form.carbsTargetG.trim() ||
        form.fatTargetG.trim()
    );
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || undefined,
        age: form.age ? Number(form.age) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        gender: form.gender,
        activityLevel: form.activityLevel,
        trainingGoal: form.trainingGoal,
        nutritionGoal: form.nutritionGoal,
        experienceLevel: form.experienceLevel,
        workoutDaysPerWeek: form.workoutDaysPerWeek
          ? Number(form.workoutDaysPerWeek)
          : undefined,
        manualCalorieTarget: manualMacros || undefined,
        calorieTarget:
          manualMacros && form.calorieTarget ? Number(form.calorieTarget) : undefined,
        proteinTargetG:
          manualMacros && form.proteinTargetG ? Number(form.proteinTargetG) : undefined,
        carbsTargetG:
          manualMacros && form.carbsTargetG ? Number(form.carbsTargetG) : undefined,
        fatTargetG: manualMacros && form.fatTargetG ? Number(form.fatTargetG) : undefined,
        waterTargetMl: form.waterTargetMl ? Number(form.waterTargetMl) : undefined,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
        targetWeightDate: form.targetWeightDate || undefined,
        bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined,
        muscleMassKg: form.muscleMassKg ? Number(form.muscleMassKg) : undefined,
        neckCm: form.neckCm ? Number(form.neckCm) : undefined,
        chestCm: form.chestCm ? Number(form.chestCm) : undefined,
        waistCm: form.waistCm ? Number(form.waistCm) : undefined,
        hipsCm: form.hipsCm ? Number(form.hipsCm) : undefined,
      }),
    });
    setSaving(false);
    let data: {
      error?: string;
      profile?: unknown;
      calculations?: CalcPreview;
      smartGoal?: { weightProjection?: string };
      user?: { name?: string; image?: string | null };
    } = {};
    try {
      data = await res.json();
    } catch {
      toast.error("Ungültige Server-Antwort");
      return;
    }
    if (!res.ok) {
      toast.error(data.error ?? "Speichern fehlgeschlagen");
      return;
    }
    if (data.calculations) setPreview(data.calculations);
    if (data.smartGoal?.weightProjection) setSmartGoalHint(data.smartGoal.weightProjection);
    else setSmartGoalHint(null);
    if (data.profile) {
      setForm(
        applyProfileToForm({
          user: { ...data.user, name: data.user?.name },
          profile: data.profile as Record<string, unknown>,
          calculations: data.calculations,
        })
      );
    }
    if (data.user?.name) setForm((f) => ({ ...f, name: data.user!.name! }));
    if (data.user?.image !== undefined) {
      setUserImage(data.user.image);
      await updateSession({ user: { image: data.user.image ?? undefined } });
    }
    const prev = getCached<ProfileApiResponse>(PROFILE_CACHE_KEY);
    setCached(
      PROFILE_CACHE_KEY,
      {
        ...prev,
        ...data,
        user: { ...prev?.user, ...data.user },
        profile: (data.profile as Record<string, unknown>) ?? prev?.profile,
      },
      120_000
    );
    invalidateAllNutritionCaches();
    toast.success("Einstellungen gespeichert");
  }

  if (loading && !getCached<ProfileApiResponse>(PROFILE_CACHE_KEY)) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="h-40 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl pb-24">
      <PageHeader
        title="Einstellungen"
        subtitle="Profil, Ziele, Vitaldaten & Design — automatische Berechnung"
      />

      <SettingsCategoryNav
        active={category}
        onSelect={(id) => {
          setCategory(id);
          document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {preview && (
        <div className="rounded-2xl border border-accent bg-accent-soft p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-zinc-500">BMI</p>
            <p className="text-lg font-bold text-white">{preview.bmi}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Kalorien</p>
            <p className="text-lg font-bold text-white">{preview.calorieTarget}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Protein</p>
            <p className="text-lg font-bold text-white">{preview.proteinTargetG} g</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Training</p>
            <p className="text-lg font-bold text-white">{preview.recommendedTrainingDays}×/Wo</p>
          </div>
        </div>
      )}

      <section id="settings-profil" className="card-premium p-4 space-y-4 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Profil</h2>
        <AvatarUpload
          imageUrl={userImage}
          name={form.name}
          onUpdated={async (url) => {
            setUserImage(url);
            await updateSession({ user: { image: url ?? undefined } });
          }}
        />
        <div>
          <Label>Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Alter</Label>
            <Input
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Geschlecht</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="MALE">Männlich</option>
              <option value="FEMALE">Weiblich</option>
            </select>
          </div>
        </div>
      </section>

      <section id="settings-ziele" className="card-premium p-4 space-y-4 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Ziele</h2>
        <p className="text-xs text-zinc-500 -mt-2">
          Kalorien, Protein & Makros werden automatisch neu berechnet.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Gewicht (kg)</Label>
            <Input
              type="number"
              value={form.weightKg}
              onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Größe (cm)</Label>
            <Input
              type="number"
              value={form.heightCm}
              onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-3 space-y-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase">Smart Goals</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Zielgewicht (kg)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="z. B. 85"
                value={form.targetWeightKg}
                onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Wunschdatum</Label>
              <Input
                type="date"
                value={form.targetWeightDate}
                onChange={(e) => setForm({ ...form, targetWeightDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          {smartGoalHint && (
            <p className="text-xs text-accent">Erwartung: {smartGoalHint}</p>
          )}
        </div>
        <div>
          <Label>Aktivitätslevel</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
            value={form.activityLevel}
            onChange={(e) =>
              setForm({ ...form, activityLevel: e.target.value as ActivityLevel })
            }
          >
            {ONBOARDING_ACTIVITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Hauptziel (Training)</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
            value={form.trainingGoal}
            onChange={(e) =>
              setForm({ ...form, trainingGoal: e.target.value as TrainingGoal })
            }
          >
            {ONBOARDING_MAIN_GOAL_UI.map((o) => (
              <option key={o.key} value={o.trainingGoal}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Ernährungsziel</Label>
          <select
            className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
            value={form.nutritionGoal}
            onChange={(e) =>
              setForm({ ...form, nutritionGoal: e.target.value as NutritionGoal })
            }
          >
            {ONBOARDING_NUTRITION_GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {NUTRITION_GOAL_LABELS[o.value]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section id="settings-vitaldaten" className="card-premium p-4 space-y-4 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Vitaldaten</h2>
        <p className="text-xs text-zinc-500">Optional — für Fortschritt & KI-Analyse</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Körperfett %</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="optional"
              value={form.bodyFatPct}
              onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Muskelmasse (kg)</Label>
            <Input
              type="number"
              step="0.1"
              placeholder="optional"
              value={form.muscleMassKg}
              onChange={(e) => setForm({ ...form, muscleMassKg: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Hals (cm)</Label>
            <Input
              type="number"
              value={form.neckCm}
              onChange={(e) => setForm({ ...form, neckCm: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Brust (cm)</Label>
            <Input
              type="number"
              value={form.chestCm}
              onChange={(e) => setForm({ ...form, chestCm: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Taille (cm)</Label>
            <Input
              type="number"
              value={form.waistCm}
              onChange={(e) => setForm({ ...form, waistCm: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Hüfte (cm)</Label>
            <Input
              type="number"
              value={form.hipsCm}
              onChange={(e) => setForm({ ...form, hipsCm: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section id="settings-training" className="card-premium p-4 space-y-4 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Training</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Erfahrung</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.experienceLevel}
              onChange={(e) =>
                setForm({ ...form, experienceLevel: e.target.value as PlanLevel })
              }
            >
              {ONBOARDING_EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Trainingstage/Woche</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.workoutDaysPerWeek}
              onChange={(e) =>
                setForm({ ...form, workoutDaysPerWeek: e.target.value })
              }
            >
              {ONBOARDING_TRAINING_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d} Tage
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section id="settings-ernaehrung" className="card-premium p-4 space-y-3 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Ernährung</h2>
        <p className="text-xs text-zinc-500">
          Leer = automatisch ({preview?.calorieTarget ?? "—"} kcal aus deinen Zielen)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kalorien (manuell)</Label>
            <Input
              type="number"
              value={form.calorieTarget}
              onChange={(e) => setForm({ ...form, calorieTarget: e.target.value })}
              placeholder={preview ? String(preview.calorieTarget) : "Auto"}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input
              type="number"
              value={form.proteinTargetG}
              onChange={(e) => setForm({ ...form, proteinTargetG: e.target.value })}
              placeholder="Auto"
              className="mt-1"
            />
          </div>
          <div>
            <Label>KH (g)</Label>
            <Input
              type="number"
              value={form.carbsTargetG}
              onChange={(e) => setForm({ ...form, carbsTargetG: e.target.value })}
              placeholder="Auto"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Fett (g)</Label>
            <Input
              type="number"
              value={form.fatTargetG}
              onChange={(e) => setForm({ ...form, fatTargetG: e.target.value })}
              placeholder="Auto"
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>Wasser (ml/Tag)</Label>
          <Input
            type="number"
            value={form.waterTargetMl}
            onChange={(e) => setForm({ ...form, waterTargetMl: e.target.value })}
            className="mt-1"
          />
        </div>
      </section>

      <section id="settings-design" className="card-premium p-4 space-y-4 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Design</h2>
        <p className="text-xs text-zinc-500">Live-Vorschau — ohne Neuladen</p>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_MODE_OPTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setColorMode(m.id)}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium",
                colorMode === m.id
                  ? "border-accent bg-accent-soft text-white"
                  : "border-zinc-700 text-zinc-400"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-zinc-700 p-4 flex items-center gap-3">
          <div
            className="h-12 w-12 rounded-xl shrink-0"
            style={{ background: APP_THEMES.find((t) => t.id === theme)?.preview }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium">
              {APP_THEMES.find((t) => t.id === theme)?.label}
            </p>
            <button type="button" className="mt-2 btn-accent text-sm px-4 py-2 rounded-lg">
              Beispiel-Button
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {APP_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                "rounded-xl border-2 p-2 transition-all",
                theme === t.id ? "border-white scale-105" : "border-transparent"
              )}
              title={t.label}
            >
              <div className="h-8 w-full rounded-lg" style={{ background: t.preview }} />
              <p className="text-[9px] text-zinc-500 mt-1 truncate">{t.label.split(" ")[0]}</p>
            </button>
          ))}
        </div>
        <div>
          <Label className="mb-2 block">Ansicht</Label>
          <div className="grid gap-2">
            {UI_DENSITY_OPTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setUiDensity(d.id)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm",
                  uiDensity === d.id
                    ? "border-accent bg-accent-soft text-white"
                    : "border-zinc-700 text-zinc-400"
                )}
              >
                <span className="font-medium">{d.label}</span>
                <span className="text-xs text-zinc-500 block">{d.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="settings-benachrichtigungen" className="card-premium p-4 space-y-3 scroll-mt-24">
        <h2 className="font-semibold text-white text-lg">Benachrichtigungen</h2>
        <p className="text-sm text-zinc-400">
          Erinnerungen für Training, Wasser und Ziele folgen in einem späteren Update. Aktuell
          erhältst du Hinweise über den KI Coach auf dem Dashboard.
        </p>
      </section>

      <Button className="w-full h-12 text-base" onClick={save} disabled={saving}>
        {saving ? "Speichern…" : "Speichern & neu berechnen"}
      </Button>
    </div>
  );
}
