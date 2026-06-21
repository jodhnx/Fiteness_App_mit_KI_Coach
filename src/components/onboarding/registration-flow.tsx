"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepIndicator, GlassCard } from "@/components/onboarding/step-indicator";
import {
  AuthScreenLayout,
  PasswordStrength,
} from "@/components/auth/auth-screen-layout";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ActivityLevel, Gender, PlanLevel } from "@prisma/client";
import type { MainGoalKey } from "@/lib/onboarding-options";
import {
  defaultNutritionGoalForMainGoal,
  trainingGoalFromMainGoalKey,
  ONBOARDING_ACTIVITY_SIMPLE,
  estimateGoalWeeks,
} from "@/lib/onboarding-options";
import { recalculateProfileTargets } from "@/lib/profile-calculations";
import { storageGetJson, storageSetJson } from "@/lib/storage-service";
import { warmTrainingCaches } from "@/lib/cache-manager";
import { startGuestSession } from "@/lib/guest-client";
import { isGuestEmail } from "@/lib/guest-utils";
import {
  type OnboardingDraft,
  type GoalPace,
  ONBOARDING_DRAFT_KEY,
  GOAL_PACE_OPTIONS,
  paceToTargetDate,
} from "@/lib/onboarding-draft";
import { CONFIG_LOCATIONS, type ConfigLocation } from "@/lib/plan-configurator";
import { PlaceholderNumberInput } from "@/components/ui/placeholder-number-input";
import { ChevronLeft, ChevronRight, Sparkles, Minus, Plus } from "lucide-react";

const PROFILE_STEPS = 12;
const TOTAL = 14;

type FormDraft = Omit<OnboardingDraft, "age" | "heightCm" | "weightKg" | "targetWeightKg"> & {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
};

type Draft = FormDraft & {
  email: string;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
};

const DEFAULT: Draft = {
  name: "",
  age: null,
  gender: "MALE",
  heightCm: null,
  weightKg: null,
  targetWeightKg: null,
  mainGoalKey: "GAIN_MUSCLE",
  activityLevel: "MODERATE",
  location: "GYM",
  experienceLevel: "BEGINNER",
  workoutDaysPerWeek: 4,
  pace: "MODERATE",
  email: "",
  password: "",
  passwordConfirm: "",
  acceptTerms: false,
};

const GOALS: { key: MainGoalKey; label: string; desc: string }[] = [
  { key: "GAIN_MUSCLE", label: "Muskelaufbau", desc: "Masse & Kraft" },
  { key: "LOSE_WEIGHT", label: "Fettverlust", desc: "Defizit & Definition" },
  { key: "ENDURANCE", label: "Gewicht halten", desc: "Stabil bleiben" },
  { key: "STRENGTH", label: "Kraftaufbau", desc: "Maximalkraft" },
  { key: "GENERAL_FITNESS", label: "Fitness", desc: "Gesund & aktiv" },
];

const EXPERIENCE: { key: PlanLevel; label: string }[] = [
  { key: "BEGINNER", label: "Anfänger" },
  { key: "INTERMEDIATE", label: "Fortgeschritten" },
  { key: "ADVANCED", label: "Profi" },
];

function Chip({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border py-3 px-3 text-sm font-medium",
        selected ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-zinc-800 text-zinc-400"
      )}
    >
      {label}
    </button>
  );
}

export function RegistrationFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, update } = useSession();
  const isConvert = params.get("convert") === "1";
  const [step, setStep] = useState(isConvert ? 14 : 1);
  const [draft, setDraft] = useState<Draft>(() => storageGetJson<Draft>(ONBOARDING_DRAFT_KEY) ?? DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"email" | "guest" | null>(isConvert ? "email" : null);

  useEffect(() => {
    storageSetJson(ONBOARDING_DRAFT_KEY, draft);
  }, [draft]);

  const patch = useCallback((p: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...p })), []);

  const plan = useMemo(() => {
    if (draft.age == null || draft.heightCm == null || draft.weightKg == null) {
      return null;
    }
    const nutritionGoal = defaultNutritionGoalForMainGoal(draft.mainGoalKey);
    const trainingGoal = trainingGoalFromMainGoalKey(draft.mainGoalKey);
    const weeks = GOAL_PACE_OPTIONS.find((p) => p.id === draft.pace)?.weeks ?? 10;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + weeks * 7);
    return recalculateProfileTargets(
      {
        age: draft.age,
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        gender: draft.gender,
        activityLevel: draft.activityLevel,
        trainingGoal,
        nutritionGoal,
        workoutDaysPerWeek: draft.workoutDaysPerWeek,
      },
      undefined,
      draft.targetWeightKg,
      targetDate
    );
  }, [draft]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return draft.name.trim().length >= 2;
      case 2:
        return draft.age != null && draft.age >= 14 && draft.age <= 100;
      case 3:
        return true;
      case 4:
        return draft.heightCm != null && draft.heightCm >= 100 && draft.heightCm <= 250;
      case 5:
        return draft.weightKg != null && draft.weightKg >= 30 && draft.weightKg <= 300;
      case 6:
        return draft.targetWeightKg != null && draft.targetWeightKg >= 30 && draft.targetWeightKg <= 300;
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
      case 12:
        return true;
      case 13:
        return plan != null;
      case 14:
        if (authMode === "guest") return true;
        if (authMode === "email") {
          return (
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) &&
            draft.password.length >= 8 &&
            draft.password === draft.passwordConfirm &&
            draft.acceptTerms
          );
        }
        return authMode != null;
      default:
        return false;
    }
  }, [step, draft, authMode, plan]);

  const onboardingPayload = useCallback((): OnboardingDraft => {
    const { email, password, passwordConfirm, acceptTerms, ...rest } = draft;
    void email;
    void password;
    void passwordConfirm;
    void acceptTerms;
    return {
      ...rest,
      age: rest.age!,
      heightCm: rest.heightCm!,
      weightKg: rest.weightKg!,
    };
  }, [draft]);

  const buildOnboardingApiBody = useCallback(
    (ob: OnboardingDraft) => {
      const targetDate = paceToTargetDate(ob.pace);
      return {
        name: ob.name,
        gender: ob.gender,
        age: ob.age,
        heightCm: ob.heightCm,
        weightKg: ob.weightKg,
        activityLevel: ob.activityLevel,
        mainGoalKey: ob.mainGoalKey,
        experienceLevel: ob.experienceLevel,
        workoutDaysPerWeek: ob.workoutDaysPerWeek,
        targetWeightKg: ob.targetWeightKg,
        targetWeightDate: targetDate.toISOString().slice(0, 10),
        trainingLocation: ob.location,
        nutritionGoal: defaultNutritionGoalForMainGoal(ob.mainGoalKey),
      };
    },
    []
  );

  async function finishAsGuest() {
    setSubmitting(true);
    const ob = onboardingPayload();
    const isGuestUser = session?.user?.email && isGuestEmail(session.user.email);

    if (isGuestUser && session?.user?.id) {
      const obRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOnboardingApiBody(ob)),
      });
      const obData = await obRes.json().catch(() => ({}));
      if (!obRes.ok) {
        toast.error(obData.error ?? "Profil konnte nicht gespeichert werden");
        setSubmitting(false);
        return;
      }
      toast.success("Profil gespeichert");
      router.replace("/home");
      setSubmitting(false);
      return;
    }

    const r = await startGuestSession(ob);
    setSubmitting(false);
    if (!r.ok) {
      toast.error(r.error ?? "Fehler");
      return;
    }
    storageSetJson(ONBOARDING_DRAFT_KEY, null);
    toast.success("Willkommen bei NEXFORM!");
    router.replace("/home");
  }

  async function finishWithEmail() {
    setSubmitting(true);
    const ob = onboardingPayload();
    const isGuestUser = session?.user?.email && isGuestEmail(session.user.email);

    try {
      if (isGuestUser) {
        const conv = await fetch("/api/auth/convert-guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: draft.email.trim(),
            password: draft.password,
            name: ob.name,
          }),
        });
        const convData = await conv.json();
        if (!conv.ok) {
          toast.error(convData.error ?? "Konvertierung fehlgeschlagen");
          return;
        }
        await signIn("credentials", {
          email: draft.email.trim(),
          password: draft.password,
          redirect: false,
        });
      } else {
        const reg = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ob.name,
            email: draft.email.trim(),
            password: draft.password,
          }),
        });
        const regData = await reg.json();
        if (!reg.ok) {
          toast.error(regData.error ?? "Registrierung fehlgeschlagen");
          return;
        }
        const login = await signIn("credentials", {
          email: draft.email.trim(),
          password: draft.password,
          redirect: false,
        });
        if (login?.error) {
          toast.error("Konto erstellt — bitte anmelden");
          router.push("/login");
          return;
        }
      }

      const obRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildOnboardingApiBody(ob)),
      });
      const obData = await obRes.json().catch(() => ({}));
      if (!obRes.ok) {
        toast.error(obData.error ?? "Profil konnte nicht gespeichert werden");
        return;
      }

      await update({ onboardingComplete: true });
      storageSetJson(ONBOARDING_DRAFT_KEY, null);
      warmTrainingCaches(true);
      toast.success("Dein Plan ist bereit!");
      router.replace("/home");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (step === 14) {
      if (authMode === "guest") void finishAsGuest();
      else if (authMode === "email") void finishWithEmail();
      return;
    }
    if (step < TOTAL) setStep((s) => s + 1);
  }

  const content = (
    <div className="space-y-5">
      {!isConvert && step <= PROFILE_STEPS && (
        <StepIndicator step={step} total={PROFILE_STEPS} />
      )}

      {step === 1 && (
        <GlassCard>
          <Label>Name</Label>
          <Input
            className="mt-2 h-14 text-lg rounded-xl keyboard-stable-input"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Dein Name"
            autoFocus
          />
        </GlassCard>
      )}

      {step === 2 && (
        <GlassCard>
          <Label>Alter</Label>
          <PlaceholderNumberInput
            className="mt-2 h-14 text-lg rounded-xl"
            value={draft.age}
            onChange={(age) => patch({ age })}
            placeholder="18"
            inputMode="numeric"
            autoFocus
          />
        </GlassCard>
      )}

      {step === 3 && (
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "MALE" as Gender, l: "Männlich" },
              { v: "FEMALE" as Gender, l: "Weiblich" },
              { v: "OTHER" as Gender, l: "Divers" },
            ] as const
          ).map((g) => (
            <Chip key={g.v} selected={draft.gender === g.v} onClick={() => patch({ gender: g.v })} label={g.l} />
          ))}
        </div>
      )}

      {step === 4 && (
        <GlassCard>
          <Label>Größe</Label>
          <PlaceholderNumberInput
            className="mt-2 h-14 text-lg rounded-xl"
            value={draft.heightCm}
            onChange={(heightCm) => patch({ heightCm })}
            placeholder="180 cm"
            inputMode="numeric"
            autoFocus
          />
        </GlassCard>
      )}

      {step === 5 && (
        <GlassCard>
          <Label>Aktuelles Gewicht</Label>
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                const base = draft.weightKg ?? 70;
                patch({ weightKg: Math.max(30, Math.round((base - 0.5) * 10) / 10) });
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <PlaceholderNumberInput
              className="h-14 text-lg text-center"
              value={draft.weightKg}
              onChange={(weightKg) => patch({ weightKg })}
              placeholder="70 kg"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => {
                const base = draft.weightKg ?? 70;
                patch({ weightKg: Math.round((base + 0.5) * 10) / 10 });
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </GlassCard>
      )}

      {step === 6 && (
        <GlassCard>
          <Label>Zielgewicht</Label>
          <PlaceholderNumberInput
            className="mt-2 h-14 text-lg rounded-xl"
            value={draft.targetWeightKg}
            onChange={(targetWeightKg) => patch({ targetWeightKg })}
            placeholder="75 kg"
            autoFocus
          />
        </GlassCard>
      )}

      {step === 7 && (
        <div className="space-y-2">
          {GOALS.map((g) => (
            <button key={g.key} type="button" onClick={() => patch({ mainGoalKey: g.key })} className={cn("w-full rounded-2xl border px-4 py-4 text-left", draft.mainGoalKey === g.key ? "border-cyan-400/50 bg-cyan-500/15" : "border-zinc-800 bg-zinc-900/60")}>
              <span className="font-semibold text-white block">{g.label}</span>
              <span className="text-xs text-zinc-500">{g.desc}</span>
            </button>
          ))}
        </div>
      )}

      {step === 8 && (
        <div className="space-y-2">
          {ONBOARDING_ACTIVITY_SIMPLE.map((a) => (
            <button key={a.value} type="button" onClick={() => patch({ activityLevel: a.value as ActivityLevel })} className={cn("w-full rounded-2xl border px-4 py-3 text-left", draft.activityLevel === a.value ? "border-cyan-400/50 bg-cyan-500/15" : "border-zinc-800")}>
              <span className="font-medium text-white">{a.label}</span>
              <span className="text-xs text-zinc-500 block">{a.hint}</span>
            </button>
          ))}
        </div>
      )}

      {step === 9 && (
        <div className="grid grid-cols-1 gap-2">
          {CONFIG_LOCATIONS.map((l) => (
            <Chip key={l.id} selected={draft.location === l.id} onClick={() => patch({ location: l.id as ConfigLocation })} label={l.label} />
          ))}
        </div>
      )}

      {step === 10 && (
        <div className="grid grid-cols-1 gap-2">
          {EXPERIENCE.map((e) => (
            <Chip key={e.key} selected={draft.experienceLevel === e.key} onClick={() => patch({ experienceLevel: e.key })} label={e.label} />
          ))}
        </div>
      )}

      {step === 11 && (
        <GlassCard className="text-center">
          <p className="text-4xl font-bold text-cyan-400">{draft.workoutDaysPerWeek}×</p>
          <p className="text-sm text-zinc-500 mt-1">Training pro Woche</p>
          <div className="flex justify-center gap-3 mt-4">
            <Button type="button" variant="outline" size="icon" disabled={draft.workoutDaysPerWeek <= 1} onClick={() => patch({ workoutDaysPerWeek: draft.workoutDaysPerWeek - 1 })}><Minus /></Button>
            <Button type="button" variant="outline" size="icon" disabled={draft.workoutDaysPerWeek >= 7} onClick={() => patch({ workoutDaysPerWeek: draft.workoutDaysPerWeek + 1 })}><Plus /></Button>
          </div>
        </GlassCard>
      )}

      {step === 12 && (
        <div className="space-y-2">
          {GOAL_PACE_OPTIONS.map((p) => (
            <button key={p.id} type="button" onClick={() => patch({ pace: p.id as GoalPace })} className={cn("w-full rounded-2xl border px-4 py-4 text-left", draft.pace === p.id ? "border-cyan-400/50 bg-cyan-500/15" : "border-zinc-800")}>
              <span className="font-semibold text-white">{p.label}</span>
              <span className="text-xs text-zinc-500 block">ca. {p.weeks} Wochen</span>
            </button>
          ))}
        </div>
      )}

      {step === 13 && plan && (
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-semibold">Dein persönlicher Plan</span>
          </div>
          <div className="text-center py-2">
            <p className="text-4xl font-bold text-cyan-400 tabular-nums">{plan.calorieTarget}</p>
            <p className="text-sm text-zinc-400">kcal / Tag</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-zinc-950/60 p-2"><p className="text-[10px] text-zinc-500">Protein</p><p className="font-bold text-white">{plan.proteinTargetG}g</p></div>
            <div className="rounded-xl bg-zinc-950/60 p-2"><p className="text-[10px] text-zinc-500">KH</p><p className="font-bold text-white">{plan.carbsTargetG}g</p></div>
            <div className="rounded-xl bg-zinc-950/60 p-2"><p className="text-[10px] text-zinc-500">Fett</p><p className="font-bold text-white">{plan.fatTargetG}g</p></div>
          </div>
          <p className="text-sm text-zinc-400 text-center">
            Geschätzte Dauer: ca. {GOAL_PACE_OPTIONS.find((p) => p.id === draft.pace)?.weeks ?? estimateGoalWeeks(draft.mainGoalKey)} Wochen
          </p>
        </GlassCard>
      )}

      {step === 14 && (
        <div className="space-y-4">
          {!isConvert && (
            <p className="text-sm text-zinc-400">Konto erstellen — oder als Gast starten.</p>
          )}
          {!isConvert && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAuthMode("email")} className={cn("rounded-xl border py-4 text-sm font-semibold", authMode === "email" ? "border-cyan-400/60 bg-cyan-500/15 text-white" : "border-zinc-800 text-zinc-400")}>
                Mit E-Mail
              </button>
              <button type="button" onClick={() => setAuthMode("guest")} className={cn("rounded-xl border py-4 text-sm font-semibold", authMode === "guest" ? "border-amber-400/60 bg-amber-500/15 text-white" : "border-zinc-800 text-zinc-400")}>
                Als Gast
              </button>
            </div>
          )}
          {isConvert && (
            <p className="text-sm text-zinc-400">Gastdaten werden übernommen — E-Mail und Passwort festlegen.</p>
          )}
          {(authMode === "email" || isConvert) && (
            <div className="space-y-3 pt-2">
              <div>
                <Label>E-Mail</Label>
                <Input
                  type="email"
                  className="mt-1.5 h-12 rounded-xl keyboard-stable-input"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder="deine@email.de"
                />
              </div>
              <div>
                <Label>Passwort</Label>
                <Input
                  type="password"
                  className="mt-1.5 h-12 rounded-xl keyboard-stable-input"
                  value={draft.password}
                  onChange={(e) => patch({ password: e.target.value })}
                />
                <PasswordStrength password={draft.password} />
              </div>
              <div>
                <Label>Passwort wiederholen</Label>
                <Input type="password" className="mt-1.5 h-12 rounded-xl keyboard-stable-input" value={draft.passwordConfirm} onChange={(e) => patch({ passwordConfirm: e.target.value })} />
              </div>
              <label className="flex items-start gap-2 text-xs text-zinc-400">
                <input type="checkbox" checked={draft.acceptTerms} onChange={(e) => patch({ acceptTerms: e.target.checked })} className="mt-0.5 accent-cyan-400" />
                AGB & Datenschutz akzeptieren
              </label>
            </div>
          )}
          {authMode === "guest" && (
            <p className="text-xs text-zinc-500">Alle Daten werden gespeichert. Später jederzeit Konto erstellen.</p>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {step > 1 && !isConvert && (
          <Button variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
          </Button>
        )}
        <Button className="flex-1 h-12 rounded-2xl btn-accent" disabled={!canContinue || submitting} onClick={handleNext}>
          {submitting ? "Speichern…" : step === 14 ? "Registrieren" : "Weiter"}
          {step < 14 && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );

  if (isConvert) {
    return (
      <AuthScreenLayout title="Konto erstellen" subtitle="Gastdaten werden übernommen">
        {content}
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Registrieren"
      subtitle={`Schritt ${Math.min(step, PROFILE_STEPS)} — Profil einrichten`}
      footer={
        <p className="text-center text-sm text-zinc-500">
          Bereits Konto?{" "}
          <Link href="/login" className="text-cyan-400 hover:underline">Anmelden</Link>
        </p>
      }
    >
      {content}
    </AuthScreenLayout>
  );
}
