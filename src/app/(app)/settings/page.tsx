"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { previewTargetsFromForm } from "@/lib/calorie-target";
import { fetchJson } from "@/lib/fetch-json";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import type { HomeDataPayload } from "@/lib/home-defaults";
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
import {
  PROFILE_CACHE_KEY,
  publishNutritionDashboard,
  NUTRITION_DASHBOARD_CACHE_KEY,
  HOME_DATA_CACHE_KEY,
  HOME_COACH_CACHE,
  HOME_INSIGHTS_CACHE,
} from "@/lib/nutrition-sync";
import { invalidateCache } from "@/lib/client-cache";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { logoutAndClear } from "@/lib/auth-logout";
import { usePreferences } from "@/components/providers/preferences-provider";
import { APP_THEMES, UI_DENSITY_OPTIONS, COLOR_MODE_OPTIONS } from "@/lib/themes";
import { SettingsHubNav } from "@/components/settings/settings-hub-nav";
import { SettingsProfileHero } from "@/components/settings/settings-profile-hero";
import { SettingsPrivacyPanel } from "@/components/settings/settings-privacy-panel";
import { SettingsNotificationsPanel } from "@/components/settings/settings-notifications-panel";
import { SettingsAboutPanel } from "@/components/settings/settings-about-panel";
import { SettingsSecurityPanel } from "@/components/settings/settings-security-panel";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { formatNumField } from "@/lib/mobile-input-scroll";
import {
  GENDER_LABELS,
  TRAINING_LOCATION_LABELS,
} from "@/lib/profile-labels";
import { ACTIVITY_LABELS } from "@/lib/profile-calculations";
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
  user?: { name?: string; username?: string | null; email?: string; image?: string | null };
  profile?: Record<string, unknown>;
  calculations?: CalcPreview;
  smartGoal?: { weightProjection?: string };
};

function applyProfileToForm(d: ProfileApiResponse) {
  const p = d.profile as Record<string, unknown> | undefined;
  return {
    name: d.user?.name ?? "",
    username: d.user?.username ?? "",
    email: d.user?.email ?? "",
    age: formatNumField(p?.age),
    weightKg: formatNumField(p?.weightKg),
    heightCm: formatNumField(p?.heightCm),
    gender: (p?.gender as string) ?? "MALE",
    activityLevel: (p?.activityLevel as ActivityLevel) ?? "MODERATE",
    trainingGoal: (p?.trainingGoal as TrainingGoal) ?? "GENERAL_FITNESS",
    nutritionGoal: (p?.nutritionGoal as NutritionGoal) ?? "MAINTENANCE",
    experienceLevel: (p?.experienceLevel as PlanLevel) ?? "BEGINNER",
    workoutDaysPerWeek: p?.workoutDaysPerWeek?.toString() ?? "3",
    calorieTarget: formatNumField(p?.calorieTarget ?? d.calculations?.calorieTarget),
    proteinTargetG: formatNumField(p?.proteinTargetG ?? d.calculations?.proteinTargetG),
    carbsTargetG: formatNumField(p?.carbsTargetG ?? d.calculations?.carbsTargetG),
    fatTargetG: formatNumField(p?.fatTargetG ?? d.calculations?.fatTargetG),
    waterTargetMl: p?.waterTargetMl?.toString() ?? "2500",
    targetWeightKg: formatNumField(p?.targetWeightKg),
    targetWeightDate: p?.targetWeightDate
      ? String(p.targetWeightDate).slice(0, 10)
      : "",
    trainingLocation: (p?.trainingLocation as string) ?? "GYM",
    bodyFatPct: formatNumField(p?.bodyFatPct),
    muscleMassKg: p?.muscleMassKg?.toString() ?? "",
    neckCm: p?.neckCm?.toString() ?? "",
    chestCm: p?.chestCm?.toString() ?? "",
    waistCm: p?.waistCm?.toString() ?? "",
    hipsCm: p?.hipsCm?.toString() ?? "",
  };
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse space-y-4 max-w-2xl">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-40 bg-zinc-800 rounded-xl" />
        </div>
      }
    >
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get("view");
  const { theme, uiDensity, colorMode, setTheme, setUiDensity, setColorMode } =
    usePreferences();
  const [editingPersonal, setEditingPersonal] = useState(view === "konto");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<CalcPreview | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
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
    trainingLocation: "GYM",
    bodyFatPct: "",
    muscleMassKg: "",
    neckCm: "",
    chestCm: "",
    waistCm: "",
    hipsCm: "",
  });
  const [userImage, setUserImage] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(
    () => getCached<ProfileApiResponse>(PROFILE_CACHE_KEY)?.profile != null
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [smartGoalHint, setSmartGoalHint] = useState<string | null>(null);

  const { data: profileData, loading } = useCachedFetch<ProfileApiResponse>(
    PROFILE_CACHE_KEY,
    "/api/profile",
    120_000,
    6_000,
    { revalidateOnMount: true, staleRatio: 0.5 }
  );

  useEffect(() => {
    if (!profileData) return;
    setForm(applyProfileToForm(profileData));
    setProfileLoaded(true);
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
    if (saving || !profileLoaded) return;

    const manualMacros = Boolean(
      (form.calorieTarget ?? "").trim() ||
        (form.proteinTargetG ?? "").trim() ||
        (form.carbsTargetG ?? "").trim() ||
        (form.fatTargetG ?? "").trim()
    );

    if (livePreview) {
      setPreview({
        bmi: livePreview.bmi,
        calorieTarget: livePreview.calorieTarget,
        proteinTargetG: livePreview.proteinTargetG,
        carbsTargetG: livePreview.carbsTargetG,
        fatTargetG: livePreview.fatTargetG,
        recommendedTrainingDays: livePreview.recommendedTrainingDays,
      });
    }

    setSaving(true);
    if (process.env.NODE_ENV === "development") {
      console.log("[settings] PATCH /api/profile gestartet");
    }

    try {
      const payload = {
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
        manualCalorieTarget: manualMacros ? true : undefined,
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
        trainingLocation: form.trainingLocation || undefined,
        bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined,
        muscleMassKg: form.muscleMassKg ? Number(form.muscleMassKg) : undefined,
        neckCm: form.neckCm ? Number(form.neckCm) : undefined,
        chestCm: form.chestCm ? Number(form.chestCm) : undefined,
        waistCm: form.waistCm ? Number(form.waistCm) : undefined,
        hipsCm: form.hipsCm ? Number(form.hipsCm) : undefined,
      };

      const { res, data } = await fetchJson<{
        error?: string;
        code?: string;
        profile?: Record<string, unknown>;
        calculations?: CalcPreview;
        smartGoal?: { weightProjection?: string };
        user?: { name?: string; email?: string; image?: string | null };
      }>("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        timeoutMs: 25_000,
      });

      if (process.env.NODE_ENV === "development") {
        console.log("[settings] PATCH Antwort", res.status, data);
      }

      if (!res.ok) {
        const msg =
          data.code === "ONBOARDING_REQUIRED"
            ? "Bitte zuerst das Onboarding abschließen."
            : data.error ?? `Speichern fehlgeschlagen (${res.status})`;
        toast.error(msg);
        return;
      }

      if (form.username.trim()) {
        const uRes = await fetch("/api/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: form.username.trim().toLowerCase() }),
        });
        const uData = await uRes.json().catch(() => ({}));
        if (!uRes.ok) {
          toast.error(uData.error ?? "Benutzername konnte nicht gespeichert werden");
          return;
        }
        if (uData.username) {
          setForm((f) => ({ ...f, username: uData.username }));
        }
      }

      if (data.calculations) setPreview(data.calculations);
      if (data.smartGoal?.weightProjection) setSmartGoalHint(data.smartGoal.weightProjection);
      else setSmartGoalHint(null);

      if (data.profile) {
        setForm(
          applyProfileToForm({
            user: data.user,
            profile: data.profile,
            calculations: data.calculations,
          })
        );
      }
      if (data.user?.name) setForm((f) => ({ ...f, name: data.user!.name! }));
      if (data.user?.email) setForm((f) => ({ ...f, email: data.user!.email! }));

      const prev = getCached<ProfileApiResponse>(PROFILE_CACHE_KEY);
      const nextProfile: ProfileApiResponse = {
        ...prev,
        ...data,
        user: { ...prev?.user, ...data.user },
        profile: data.profile ?? prev?.profile,
        calculations: data.calculations ?? prev?.calculations,
      };
      setCached(PROFILE_CACHE_KEY, nextProfile, 120_000);

      // Capture dash BEFORE invalidate so we can patch targets immediately
      const prevDash = getCached<NutritionDashboardPayload>(
        NUTRITION_DASHBOARD_CACHE_KEY,
        { allowStale: true }
      );
      const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
        allowStale: true,
      });

      if (data.calculations && prevDash) {
        const targets = {
          calories: data.calculations.calorieTarget,
          proteinG: data.calculations.proteinTargetG,
          carbsG: data.calculations.carbsTargetG,
          fatG: data.calculations.fatTargetG,
        };
        publishNutritionDashboard({
          ...prevDash,
          profileComplete: true,
          targets: {
            ...prevDash.targets,
            ...targets,
            fiberG: prevDash.targets.fiberG,
            waterTargetMl: prevDash.targets.waterTargetMl,
            nutritionGoal:
              (data.profile?.nutritionGoal as typeof prevDash.targets.nutritionGoal) ??
              prevDash.targets.nutritionGoal,
          },
          remaining: {
            calories: Math.max(0, targets.calories - prevDash.consumed.calories),
            proteinG: Math.max(0, targets.proteinG - prevDash.consumed.proteinG),
            carbsG: Math.max(0, targets.carbsG - prevDash.consumed.carbsG),
            fatG: Math.max(0, targets.fatG - prevDash.consumed.fatG),
          },
        });
        const updatedDash = getCached<NutritionDashboardPayload>(
          NUTRITION_DASHBOARD_CACHE_KEY
        );
        if (prevHome && updatedDash) {
          setCached(
            HOME_DATA_CACHE_KEY,
            {
              ...prevHome,
              ...nutritionDashboardToHomeMacros(updatedDash),
              userName: data.user?.name ?? prevHome.userName ?? null,
            },
            900_000
          );
        }
      }

      // Fresh server truth in background (does not wipe optimistic UI)
      void fetch("/api/nutrition/dashboard", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((dash) => {
          if (dash) publishNutritionDashboard(dash);
        })
        .catch(() => undefined);
      void fetch("/api/home", { credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((home) => {
          if (home) setCached(HOME_DATA_CACHE_KEY, home, 900_000);
        })
        .catch(() => undefined);

      if (data.user?.image !== undefined) {
        setUserImage(data.user.image);
      }

      invalidateCache(HOME_COACH_CACHE);
      invalidateCache(HOME_INSIGHTS_CACHE);
      invalidateCache("nutrition-coach");

      toast.success("Einstellungen gespeichert");
      setEditingPersonal(false);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Speichern fehlgeschlagen — unbekannter Fehler";
      console.error("[settings] save failed", e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (view === "konto") setEditingPersonal(true);
  }, [view]);

  if (loading && !getCached<ProfileApiResponse>(PROFILE_CACHE_KEY)) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="h-40 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="space-y-5 max-w-2xl pb-24">
        <PageHeader
          title="Einstellungen"
          subtitle="Konto, Geräte & App — klar und übersichtlich"
        />
        {(form.name || form.username) && (
          <SettingsProfileHero
            form={form}
            userImage={userImage}
            calorieTarget={preview?.calorieTarget ?? null}
            editing={false}
            onEdit={() => router.push("/settings?view=konto")}
            onImageUpdated={(url) => setUserImage(url)}
          />
        )}
        <SettingsHubNav />
      </div>
    );
  }

  const backLink = (
    <Link
      href="/settings"
      prefetch
      className="inline-flex items-center gap-1 text-sm font-medium text-accent active:opacity-80 -ml-1 py-1"
    >
      <ChevronLeft className="h-5 w-5" />
      Einstellungen
    </Link>
  );

  if (view === "privacy") {
    return (
      <div className="space-y-4 max-w-2xl pb-24">
        {backLink}
        <SettingsPrivacyPanel />
        <SettingsSecurityPanel mode="delete" />
      </div>
    );
  }

  if (view === "notifications") {
    return (
      <div className="space-y-4 max-w-2xl pb-24">
        {backLink}
        <SettingsNotificationsPanel />
      </div>
    );
  }

  if (view === "about") {
    return (
      <div className="space-y-4 max-w-2xl pb-24">
        {backLink}
        <SettingsAboutPanel />
      </div>
    );
  }

  // view === "konto" (default for any other view string)
  return (
    <div className="space-y-6 max-w-2xl pb-24">
      {backLink}
      <PageHeader
        title="Konto bearbeiten"
        subtitle="Persönliche Daten, Ziele & Sicherheit"
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

      <section id="settings-profil" className="settings-section">
      <SettingsProfileHero
        form={form}
        userImage={userImage}
        calorieTarget={preview?.calorieTarget ?? null}
        editing={editingPersonal}
        onEdit={() => setEditingPersonal(true)}
        onImageUpdated={(url) => setUserImage(url)}
      />
      </section>

      {editingPersonal && (
        <>
          <section className="card-premium p-4 space-y-4 settings-section">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-lg">Persönliche Daten bearbeiten</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (profileData) setForm(applyProfileToForm(profileData));
                  setEditingPersonal(false);
                }}
              >
                Abbrechen
              </Button>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Benutzername</Label>
              <p className="text-[11px] text-zinc-500 mt-0.5 mb-1">
                Für Freunde & Community — eindeutig
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                <Input
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "")
                        .slice(0, 24),
                    })
                  }
                  className="mt-1 pl-7"
                  placeholder="dein_name"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                value={form.email}
                readOnly
                className="mt-1 opacity-80"
                autoComplete="email"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Login-E-Mail — Änderung nur über Support möglich
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Alter</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="18"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value.replace(/[^\d]/g, "") })}
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
        </>
      )}

      <section id="settings-ziele" className="card-premium p-4 space-y-4 settings-section">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-white text-lg">Ziele</h2>
          {!editingPersonal && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditingPersonal(true)}>
              Bearbeiten
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          Kalorien, Protein & Makros werden automatisch neu berechnet.
        </p>
        {editingPersonal ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gewicht (kg)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="70 kg"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value.replace(/[^\d,.]/g, "") })}
                  className="mt-1 keyboard-stable-input"
                />
              </div>
              <div>
                <Label>Größe (cm)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="180 cm"
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value.replace(/[^\d]/g, "") })}
                  className="mt-1 keyboard-stable-input"
                />
              </div>
            </div>
            <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-3 space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase">Smart Goals</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Zielgewicht (kg)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="75 kg"
                    value={form.targetWeightKg}
                    onChange={(e) => setForm({ ...form, targetWeightKg: e.target.value.replace(/[^\d,.]/g, "") })}
                    className="mt-1 keyboard-stable-input"
                  />
                </div>
                <div>
                  <Label>Wunschdatum</Label>
                  <Input
                    type="date"
                    value={form.targetWeightDate}
                    onChange={(e) => setForm({ ...form, targetWeightDate: e.target.value })}
                    className="mt-1 keyboard-stable-input"
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
            <Button type="button" onClick={save} disabled={saving} className="w-full">
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Gewicht</p>
              <p className="text-white font-medium">{form.weightKg || "—"} kg</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Größe</p>
              <p className="text-white font-medium">{form.heightCm || "—"} cm</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Zielgewicht</p>
              <p className="text-white font-medium">{form.targetWeightKg || "—"} kg</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Ernährungsziel</p>
              <p className="text-white font-medium">
                {NUTRITION_GOAL_LABELS[form.nutritionGoal] ?? form.nutritionGoal}
              </p>
            </div>
          </div>
        )}
      </section>

      <section id="settings-vitaldaten" className="card-premium p-4 space-y-4 settings-section">
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

      <section id="settings-training" className="card-premium p-4 space-y-4 settings-section">
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
          <div className="col-span-2">
            <Label>Trainingsort</Label>
            <select
              className="mt-1 w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm"
              value={form.trainingLocation}
              onChange={(e) => setForm({ ...form, trainingLocation: e.target.value })}
            >
              <option value="GYM">Gym</option>
              <option value="HOME">Zuhause</option>
              <option value="BOTH">Gym & Zuhause</option>
            </select>
          </div>
        </div>
      </section>

      <section id="settings-ernaehrung" className="card-premium p-4 space-y-3 settings-section">
        <h2 className="font-semibold text-white text-lg">Ernährung</h2>
        <p className="text-xs text-zinc-500">
          Leer = automatisch ({preview?.calorieTarget ?? "—"} kcal aus deinen Zielen)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Kalorien (manuell)</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="z. B. 2200"
              value={form.calorieTarget}
              onChange={(e) => setForm({ ...form, calorieTarget: e.target.value.replace(/[^\d]/g, "") })}
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

      <section id="settings-design" className="card-premium p-4 space-y-4 settings-section">
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

      <SettingsSecurityPanel mode="password" />

      <section id="settings-konto" className="card-premium p-4 space-y-4 settings-section scroll-mt-4">
        <h2 className="font-semibold text-white text-lg">Konto-Übersicht</h2>
        <p className="text-xs text-zinc-500">Persönliche Daten, Körperdaten & Ziele</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Name</dt>
            <dd className="font-medium text-white mt-0.5">{form.name || "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Benutzername</dt>
            <dd className="font-medium text-accent mt-0.5">
              {form.username ? `@${form.username}` : "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">E-Mail</dt>
            <dd className="font-medium text-white mt-0.5 break-all">{form.email || "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Alter</dt>
            <dd className="font-medium text-white mt-0.5">{form.age ? `${form.age} Jahre` : "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Geschlecht</dt>
            <dd className="font-medium text-white mt-0.5">{GENDER_LABELS[form.gender] ?? "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Größe</dt>
            <dd className="font-medium text-white mt-0.5">{form.heightCm ? `${form.heightCm} cm` : "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Gewicht</dt>
            <dd className="font-medium text-white mt-0.5">{form.weightKg ? `${form.weightKg} kg` : "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Zielgewicht</dt>
            <dd className="font-medium text-white mt-0.5">{form.targetWeightKg ? `${form.targetWeightKg} kg` : "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Ziel</dt>
            <dd className="font-medium text-white mt-0.5">{NUTRITION_GOAL_LABELS[form.nutritionGoal] ?? "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Aktivitätslevel</dt>
            <dd className="font-medium text-white mt-0.5">{ACTIVITY_LABELS[form.activityLevel] ?? "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Trainingsort</dt>
            <dd className="font-medium text-white mt-0.5">{TRAINING_LOCATION_LABELS[form.trainingLocation] ?? "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Training / Woche</dt>
            <dd className="font-medium text-white mt-0.5">{form.workoutDaysPerWeek ? `${form.workoutDaysPerWeek}×` : "—"}</dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Kalorienziel</dt>
            <dd className="font-medium text-cyan-400 mt-0.5 tabular-nums">
              {preview?.calorieTarget ? `${preview.calorieTarget} kcal` : "—"}
            </dd>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3 sm:col-span-2">
            <dt className="text-[10px] uppercase tracking-wide text-zinc-500">Makros</dt>
            <dd className="font-medium text-white mt-0.5 tabular-nums">
              P {preview?.proteinTargetG ?? "—"}g · KH {preview?.carbsTargetG ?? "—"}g · F {preview?.fatTargetG ?? "—"}g
            </dd>
          </div>
        </dl>
        <Button
          type="button"
          variant="outline"
          className="w-full border-red-500/40 text-red-300 hover:bg-red-500/10"
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            try {
              await logoutAndClear("/login");
            } finally {
              setLoggingOut(false);
            }
          }}
        >
          {loggingOut ? "Abmelden…" : "Abmelden"}
        </Button>
      </section>

      <Button
        type="button"
        className="w-full h-12 text-base sticky bottom-20 z-10 shadow-lg"
        onClick={() => void save()}
        disabled={saving || !profileLoaded}
      >
        {saving ? "Speichern…" : "Speichern & neu berechnen"}
      </Button>
    </div>
  );
}
