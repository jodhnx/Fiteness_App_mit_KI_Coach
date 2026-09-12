"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { previewTargetsFromForm } from "@/lib/calorie-target";
import { fetchJson } from "@/lib/fetch-json";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import type { ActivityLevel, NutritionGoal, PlanLevel, TrainingGoal } from "@prisma/client";
import {
  PROFILE_CACHE_KEY,
  publishNutritionDashboard,
  NUTRITION_DASHBOARD_CACHE_KEY,
  HOME_DATA_CACHE_KEY,
  HOME_COACH_CACHE,
  HOME_INSIGHTS_CACHE,
  HOME_DATA_EVENT,
} from "@/lib/nutrition-sync";
import { invalidateCache } from "@/lib/client-cache";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
} from "@/lib/nutrition-defaults";
import { logoutAndClear } from "@/lib/auth-logout";
import { usePreferences } from "@/components/providers/preferences-provider";
import { APP_THEMES, COLOR_MODE_OPTIONS } from "@/lib/themes";
import { SettingsHubNav } from "@/components/settings/settings-hub-nav";
import { SettingsProfileOverview } from "@/components/settings/settings-profile-overview";
import {
  SettingsProfileEditSheet,
  type ProfileEditForm,
} from "@/components/settings/settings-profile-edit-sheet";
import { SettingsPrivacyPanel } from "@/components/settings/settings-privacy-panel";
import { SettingsNotificationsPanel } from "@/components/settings/settings-notifications-panel";
import { SettingsAboutPanel } from "@/components/settings/settings-about-panel";
import { SettingsSecurityPanel } from "@/components/settings/settings-security-panel";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { formatNumField } from "@/lib/mobile-input-scroll";
import { getCached, setCached } from "@/lib/client-cache";
import { commitHomeIntelligenceRefresh } from "@/lib/intelligence/client-refresh";
import { fetchBootstrapShared, applyBootstrapPayload } from "@/lib/app-init";
import { computeNutritionRemaining } from "@/lib/nutrition-display";
import { nutritionDayKey, nutritionDayQueryString } from "@/lib/nutrition-day";
import { parseManualCalorieTargetInput } from "@/lib/daily-kcal";

function parseDecInput(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number(raw.trim().replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  return n;
}

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
    countryCode: (p?.countryCode as string) === "DE" ? "DE" : "AT",
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
  const { theme, colorMode, setTheme, setColorMode } =
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
    countryCode: "AT",
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
  const formBaselineRef = useRef<string>("");

  const cachedProfile = getCached<ProfileApiResponse>(PROFILE_CACHE_KEY, {
    allowStale: true,
  });
  const profileNeedsFullFetch = !(
    cachedProfile?.profile?.age != null &&
    cachedProfile?.profile?.heightCm != null &&
    cachedProfile?.user?.email
  );

  const { data: profileData, loading } = useCachedFetch<ProfileApiResponse>(
    PROFILE_CACHE_KEY,
    "/api/profile",
    180_000,
    8_000,
    {
      // Boot stub must not block a full profile fetch when fields are missing.
      revalidateOnMount: profileNeedsFullFetch,
      staleRatio: 0.95,
    }
  );

  useEffect(() => {
    if (!profileData) return;
    if (editingPersonal) return;
    const next = applyProfileToForm(profileData);
    setForm(next);
    formBaselineRef.current = JSON.stringify(next);
    setProfileLoaded(true);
    if (profileData.calculations) setPreview(profileData.calculations);
    setUserImage(profileData.user?.image ?? null);
  }, [profileData, editingPersonal]);

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

  async function save(sourceForm: ProfileEditForm = form): Promise<boolean> {
    if (saving || !profileLoaded) return false;

    const manualMacros = Boolean(
      (sourceForm.calorieTarget ?? "").trim() ||
        (sourceForm.proteinTargetG ?? "").trim() ||
        (sourceForm.carbsTargetG ?? "").trim() ||
        (sourceForm.fatTargetG ?? "").trim()
    );

    const sourcePreview = previewTargetsFromForm(sourceForm);
    if (sourcePreview) {
      setPreview({
        bmi: sourcePreview.bmi,
        calorieTarget: sourcePreview.calorieTarget,
        proteinTargetG: sourcePreview.proteinTargetG,
        carbsTargetG: sourcePreview.carbsTargetG,
        fatTargetG: sourcePreview.fatTargetG,
        recommendedTrainingDays: sourcePreview.recommendedTrainingDays,
      });
    }

    setSaving(true);
    if (process.env.NODE_ENV === "development") {
      console.log("[settings] PATCH /api/profile gestartet");
    }

    try {
      const payload = {
        name: sourceForm.name || undefined,
        age: sourceForm.age ? Number(sourceForm.age.replace(/[^\d]/g, "")) : undefined,
        weightKg: parseDecInput(sourceForm.weightKg),
        heightCm: sourceForm.heightCm
          ? Number(sourceForm.heightCm.replace(/[^\d]/g, ""))
          : undefined,
        gender: sourceForm.gender,
        activityLevel: sourceForm.activityLevel,
        trainingGoal: sourceForm.trainingGoal,
        nutritionGoal: sourceForm.nutritionGoal,
        experienceLevel: sourceForm.experienceLevel,
        workoutDaysPerWeek: sourceForm.workoutDaysPerWeek
          ? Number(sourceForm.workoutDaysPerWeek)
          : undefined,
        manualCalorieTarget: manualMacros ? true : undefined,
        calorieTarget:
          manualMacros && sourceForm.calorieTarget
            ? parseManualCalorieTargetInput(sourceForm.calorieTarget) ?? undefined
            : undefined,
        proteinTargetG:
          manualMacros && sourceForm.proteinTargetG
            ? parseDecInput(sourceForm.proteinTargetG)
            : undefined,
        carbsTargetG:
          manualMacros && sourceForm.carbsTargetG
            ? parseDecInput(sourceForm.carbsTargetG)
            : undefined,
        fatTargetG:
          manualMacros && sourceForm.fatTargetG
            ? parseDecInput(sourceForm.fatTargetG)
            : undefined,
        waterTargetMl: sourceForm.waterTargetMl
          ? Number(sourceForm.waterTargetMl.replace(/[^\d]/g, ""))
          : undefined,
        targetWeightKg: parseDecInput(sourceForm.targetWeightKg),
        targetWeightDate: sourceForm.targetWeightDate || undefined,
        trainingLocation: sourceForm.trainingLocation || undefined,
        countryCode: sourceForm.countryCode === "DE" ? "DE" : "AT",
        bodyFatPct: parseDecInput(sourceForm.bodyFatPct),
        muscleMassKg: parseDecInput(sourceForm.muscleMassKg),
        neckCm: parseDecInput(sourceForm.neckCm),
        chestCm: parseDecInput(sourceForm.chestCm),
        waistCm: parseDecInput(sourceForm.waistCm),
        hipsCm: parseDecInput(sourceForm.hipsCm),
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
        return false;
      }

      if (sourceForm.username.trim()) {
        const uRes = await fetch("/api/username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: sourceForm.username.trim().toLowerCase() }),
        });
        const uData = await uRes.json().catch(() => ({}));
        if (!uRes.ok) {
          toast.error(uData.error ?? "Benutzername konnte nicht gespeichert werden");
          return false;
        }
        if (uData.username) {
          setForm((f) => ({ ...f, username: uData.username }));
        }
      }

      if (data.calculations) setPreview(data.calculations);

      if (data.profile) {
        const nextForm = applyProfileToForm({
          user: data.user,
          profile: data.profile,
          calculations: data.calculations,
        });
        setForm(nextForm);
        formBaselineRef.current = JSON.stringify(nextForm);
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

      const prevDash = getCached<NutritionDashboardPayload>(
        NUTRITION_DASHBOARD_CACHE_KEY,
        { allowStale: true }
      );
      const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
        allowStale: true,
      });

      if (data.calculations) {
        const base =
          prevDash && isValidDashboardPayload(prevDash)
            ? prevDash
            : createEmptyNutritionDashboard();
        const targets = {
          calories: data.calculations.calorieTarget,
          proteinG: data.calculations.proteinTargetG,
          carbsG: data.calculations.carbsTargetG,
          fatG: data.calculations.fatTargetG,
          fiberG: base.targets.fiberG,
          waterTargetMl:
            typeof data.profile?.waterTargetMl === "number"
              ? Number(data.profile.waterTargetMl)
              : base.targets.waterTargetMl,
          nutritionGoal:
            (data.profile?.nutritionGoal as typeof base.targets.nutritionGoal) ??
            base.targets.nutritionGoal,
        };
        publishNutritionDashboard({
          ...base,
          date: nutritionDayKey(),
          profileComplete: true,
          targets,
          remaining: computeNutritionRemaining({
            targets,
            consumed: base.consumed,
            exerciseBurned: base.exerciseBurned,
          }),
        });
        const refreshedHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, {
          allowStale: true,
        });
        if (refreshedHome || prevHome) {
          const homeBase = refreshedHome ?? prevHome!;
          const nextHome = commitHomeIntelligenceRefresh({
            ...homeBase,
            userName: data.user?.name ?? homeBase.userName ?? null,
            userImage:
              data.user?.image !== undefined ? data.user.image : homeBase.userImage,
            weightKg:
              typeof data.profile?.weightKg === "number"
                ? Number(data.profile.weightKg)
                : homeBase.weightKg,
          });
          setCached(HOME_DATA_CACHE_KEY, nextHome, 900_000);
          window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: nextHome }));
        }
      } else if (prevHome && (data.user?.name || data.user?.image !== undefined)) {
        const nextHome: HomeDataPayload = {
          ...prevHome,
          userName: data.user?.name ?? prevHome.userName ?? null,
          userImage:
            data.user?.image !== undefined ? data.user.image : prevHome.userImage,
        };
        setCached(HOME_DATA_CACHE_KEY, nextHome, 900_000);
        window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: nextHome }));
      }

      void fetch(`/api/nutrition/dashboard?${nutritionDayQueryString()}`, {
        credentials: "same-origin",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((dash) => {
          if (dash) publishNutritionDashboard(dash);
        })
        .catch(() => undefined);

      void fetchBootstrapShared({ force: true }).then((fresh) => {
        if (fresh) applyBootstrapPayload(fresh);
      });

      if (data.user?.image !== undefined) {
        setUserImage(data.user.image);
      }

      invalidateCache(HOME_COACH_CACHE);
      invalidateCache(HOME_INSIGHTS_CACHE);
      invalidateCache("nutrition-coach");

      toast.success("Änderungen gespeichert");
      setEditingPersonal(false);
      if (view === "konto") {
        router.replace("/settings", { scroll: false });
      }
      return true;
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Speichern fehlgeschlagen â€” unbekannter Fehler";
      console.error("[settings] save failed", e);
      toast.error(msg);
      return false;
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
      <div className="space-y-5 max-w-xl lg:max-w-2xl pb-24 mx-auto w-full">
        <PageHeader
          title="Einstellungen"
          subtitle="Profil, Ziele und App"
        />
        {(profileLoaded || form.name || form.email) && (
          <SettingsProfileOverview
            form={form}
            userImage={userImage}
            calorieTarget={preview?.calorieTarget ?? null}
            onEdit={() => setEditingPersonal(true)}
          />
        )}
        <SettingsHubNav
          loggingOut={loggingOut}
          onLogout={async () => {
            setLoggingOut(true);
            try {
              await logoutAndClear("/login");
            } finally {
              setLoggingOut(false);
            }
          }}
        />
        <SettingsProfileEditSheet
          open={editingPersonal}
          initial={form}
          userImage={userImage}
          saving={saving}
          onClose={() => setEditingPersonal(false)}
          onSave={(draft) => save(draft)}
          onImageUpdated={(url) => setUserImage(url)}
        />
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


  // view === "konto" — overview + edit sheet + security / appearance
  return (
    <div className="space-y-5 max-w-xl lg:max-w-2xl pb-24 mx-auto w-full">
      {backLink}
      <PageHeader
        title="Konto"
        subtitle="Profil, Ziele und Sicherheit"
      />

      <SettingsProfileOverview
        form={form}
        userImage={userImage}
        calorieTarget={preview?.calorieTarget ?? null}
        onEdit={() => setEditingPersonal(true)}
      />

      <section id="settings-design" className="space-y-3 scroll-mt-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 px-0.5">
          Design
        </h2>
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 space-y-4 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.02] dark:shadow-none">
          <div className="grid grid-cols-2 gap-2">
            {COLOR_MODE_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setColorMode(m.id)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  colorMode === m.id
                    ? "border-accent bg-accent text-white"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Appearance
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {APP_THEMES.map((t) => {
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "flex min-h-14 flex-col gap-2 rounded-xl border p-2.5 text-left transition-all",
                      active
                        ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                        : "border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 dark:border-white/[0.08] dark:bg-white/[0.03]"
                    )}
                    title={t.label}
                    aria-pressed={active}
                  >
                    <div
                      className="flex h-9 w-full overflow-hidden rounded-lg border border-black/5"
                      aria-hidden
                    >
                      <span
                        className="w-2/5"
                        style={{ background: t.preview }}
                      />
                      <span
                        className="flex-1"
                        style={{
                          background: t.previewSecondary ?? "#ffffff",
                        }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[12px] font-semibold leading-tight",
                        active
                          ? "text-accent"
                          : "text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div id="settings-konto" className="scroll-mt-24">
        <SettingsSecurityPanel mode="password" />
      </div>

      <SettingsProfileEditSheet
        open={editingPersonal}
        initial={form}
        userImage={userImage}
        saving={saving}
        onClose={() => {
          setEditingPersonal(false);
          router.replace("/settings", { scroll: false });
        }}
        onSave={(draft) => save(draft)}
        onImageUpdated={(url) => setUserImage(url)}
      />
    </div>
  );
}
