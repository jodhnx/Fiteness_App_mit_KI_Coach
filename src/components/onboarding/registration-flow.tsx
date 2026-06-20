"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepIndicator, GlassCard } from "@/components/onboarding/step-indicator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Gender, PlanLevel } from "@prisma/client";
import {
  calculateRegistrationCalories,
  mainGoalKeyFromRegistrationGoal,
  activityLevelFromTrainingDays,
  type RegistrationGoalKey,
} from "@/lib/calorie-calculator";
import { defaultNutritionGoalForMainGoal } from "@/lib/onboarding-options";
import { storageGetJson, storageSetJson } from "@/lib/storage-service";
import { warmTrainingCaches } from "@/lib/cache-manager";
import {
  User,
  Calendar,
  Ruler,
  Target,
  Dumbbell,
  Mail,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingDown,
  Heart,
  Zap,
  Scale,
  Minus,
  Plus,
} from "lucide-react";

const DRAFT_KEY = "registration-draft";
const TOTAL_STEPS = 8;

type Draft = {
  firstName: string;
  lastName: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  goal: RegistrationGoalKey;
  experience: PlanLevel;
  trainingDays: number;
  email: string;
  password: string;
  acceptTerms: boolean;
};

const DEFAULT_DRAFT: Draft = {
  firstName: "",
  lastName: "",
  age: 28,
  gender: "MALE",
  heightCm: 175,
  weightKg: 75,
  goal: "GAIN_MUSCLE",
  experience: "BEGINNER",
  trainingDays: 4,
  email: "",
  password: "",
  acceptTerms: false,
};

const GOALS: {
  key: RegistrationGoalKey;
  label: string;
  desc: string;
  icon: typeof Target;
}[] = [
  { key: "GAIN_MUSCLE", label: "Muskelaufbau", desc: "Masse & Kraft aufbauen", icon: Dumbbell },
  { key: "LOSE_WEIGHT", label: "Abnehmen", desc: "Fett reduzieren & definieren", icon: TrendingDown },
  { key: "MAINTAIN", label: "Fitness halten", desc: "Gewicht & Form stabil halten", icon: Heart },
  { key: "STRENGTH", label: "Leistung steigern", desc: "Kraft & Performance maximieren", icon: Zap },
];

const EXPERIENCE: { key: PlanLevel; label: string; hint: string }[] = [
  { key: "BEGINNER", label: "Beginner", hint: "0–6 Monate Training" },
  { key: "INTERMEDIATE", label: "Mittel", hint: "6 Monate – 2 Jahre" },
  { key: "ADVANCED", label: "Fortgeschritten", hint: "2+ Jahre strukturiert" },
];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-zinc-700" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { score: 33, label: "Schwach", color: "bg-red-500" };
  if (score <= 3) return { score: 66, label: "Mittel", color: "bg-amber-500" };
  return { score: 100, label: "Stark", color: "bg-emerald-500" };
}

function OptionCard({
  selected,
  onClick,
  label,
  hint,
  icon: Icon,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
  icon?: typeof Target;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
        selected
          ? "border-cyan-400/50 bg-cyan-500/15 text-white shadow-[0_0_20px_rgba(34,211,238,0.12)]"
          : "border-white/10 bg-zinc-900/50 text-zinc-300 hover:border-white/20"
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <span className="font-semibold block">{label}</span>
          {hint && <span className="text-sm text-zinc-500 mt-0.5 block">{hint}</span>}
        </div>
      </div>
    </button>
  );
}

/** Multi-step registration + profile setup (8 steps) */
export function RegistrationFlow() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(1);
  const [slideDir, setSlideDir] = useState<"fwd" | "back">("fwd");
  const [draft, setDraft] = useState<Draft>(() => storageGetJson<Draft>(DRAFT_KEY) ?? DEFAULT_DRAFT);
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const patch = useCallback((p: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...p };
      storageSetJson(DRAFT_KEY, next);
      return next;
    });
  }, []);

  const calories = useMemo(
    () =>
      calculateRegistrationCalories({
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        age: draft.age,
        gender: draft.gender,
        trainingDaysPerWeek: draft.trainingDays,
        goal: draft.goal,
      }),
    [draft]
  );

  const go = useCallback((next: number, dir: "fwd" | "back" = "fwd") => {
    setSlideDir(dir);
    setStep(next);
  }, []);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return draft.firstName.trim().length >= 1 && draft.lastName.trim().length >= 1;
      case 2:
        return draft.age >= 18 && draft.age <= 80;
      case 3:
        return draft.heightCm > 0 && draft.weightKg > 0;
      case 4:
      case 5:
      case 6:
        return true;
      case 7:
        return (
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email) &&
          draft.password.length >= 8 &&
          draft.password === passwordConfirm &&
          draft.acceptTerms
        );
      default:
        return true;
    }
  }, [step, draft, passwordConfirm]);

  async function createAccount() {
    setSubmitting(true);
    const fullName = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
    const mainGoalKey = mainGoalKeyFromRegistrationGoal(draft.goal);
    const activityLevel = activityLevelFromTrainingDays(draft.trainingDays);

    try {
      const regRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName,
          email: draft.email.trim(),
          password: draft.password,
        }),
      });
      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        toast.error(regData.error ?? "Registrierung fehlgeschlagen");
        return;
      }

      if (regData.skipVerifyPage) {
        const login = await signIn("credentials", {
          email: draft.email.trim(),
          password: draft.password,
          redirect: false,
        });
        if (login?.error) {
          toast.error("Anmeldung nach Registrierung fehlgeschlagen");
          router.push("/login");
          return;
        }

        const obRes = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            gender: draft.gender,
            age: draft.age,
            heightCm: draft.heightCm,
            weightKg: draft.weightKg,
            activityLevel,
            mainGoalKey,
            experienceLevel: draft.experience,
            workoutDaysPerWeek: draft.trainingDays,
            nutritionGoal: defaultNutritionGoalForMainGoal(mainGoalKey),
          }),
        });
        if (!obRes.ok) {
          toast.error("Profil konnte nicht gespeichert werden");
          router.push("/onboarding");
          return;
        }

        await update({ onboardingComplete: true });
        storageSetJson(DRAFT_KEY, null);
        warmTrainingCaches(true);
        toast.success("Willkommen bei NEXFORM!");
        router.replace("/home");
        return;
      }

      storageSetJson(DRAFT_KEY, { ...draft, password: "" });
      toast.success(regData.message ?? "Bestätigungscode gesendet");
      const email = encodeURIComponent(regData.email ?? draft.email);
      router.push(`/verify-email?email=${email}&onboarding=1`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  const strength = passwordStrength(draft.password);
  const slideClass =
    slideDir === "fwd"
      ? "animate-[slideIn_0.28s_ease-out]"
      : "animate-[slideInRev_0.28s_ease-out]";

  return (
    <div className="gradient-mesh min-h-[100dvh] flex flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRev {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <StepIndicator step={step} total={TOTAL_STEPS} />

        <div className={cn("flex-1 flex flex-col", slideClass)} key={step}>
          {step === 1 && (
            <GlassCard className="flex-1 flex flex-col justify-center space-y-5">
              <div className="text-center">
                <Sparkles className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
                <h1 className="text-2xl font-bold text-white">Willkommen</h1>
                <p className="text-sm text-zinc-400 mt-1">Wie dürfen wir dich nennen?</p>
              </div>
              <div>
                <Label className="text-zinc-400">Vorname</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                  <Input
                    className="h-14 pl-11 text-lg rounded-2xl bg-zinc-950/60 border-white/10"
                    value={draft.firstName}
                    onChange={(e) => patch({ firstName: e.target.value })}
                    placeholder="Max"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Nachname</Label>
                <Input
                  className="mt-1.5 h-14 text-lg rounded-2xl bg-zinc-950/60 border-white/10"
                  value={draft.lastName}
                  onChange={(e) => patch({ lastName: e.target.value })}
                  placeholder="Mustermann"
                  autoComplete="family-name"
                />
              </div>
            </GlassCard>
          )}

          {step === 2 && (
            <GlassCard className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-cyan-400" />
                  Alter & Geschlecht
                </h2>
              </div>
              <div>
                <Label className="text-zinc-400">Alter: {draft.age} Jahre</Label>
                <input
                  type="range"
                  min={18}
                  max={80}
                  value={draft.age}
                  onChange={(e) => patch({ age: Number(e.target.value) })}
                  className="w-full mt-3 accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>18</span>
                  <span>80</span>
                </div>
              </div>
              <div>
                <Label className="text-zinc-400">Geschlecht</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(
                    [
                      { v: "MALE" as Gender, l: "Männlich" },
                      { v: "FEMALE" as Gender, l: "Weiblich" },
                      { v: "OTHER" as Gender, l: "Divers" },
                    ] as const
                  ).map((g) => (
                    <button
                      key={g.v}
                      type="button"
                      onClick={() => patch({ gender: g.v })}
                      className={cn(
                        "rounded-xl border py-3 text-sm font-medium",
                        draft.gender === g.v
                          ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                          : "border-white/10 text-zinc-400"
                      )}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          )}

          {step === 3 && (
            <GlassCard className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-cyan-400" />
                  Körperdaten
                </h2>
                <p className="text-sm text-zinc-500 mt-1">Für deine Kalorienberechnung</p>
              </div>
              <div>
                <Label className="text-zinc-400">Größe (cm)</Label>
                <Input
                  type="number"
                  className="mt-1.5 h-14 text-lg rounded-2xl bg-zinc-950/60 border-white/10 tabular-nums"
                  value={draft.heightCm}
                  onChange={(e) => patch({ heightCm: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-zinc-400">Aktuelles Gewicht (kg)</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button type="button" variant="outline" size="icon" onClick={() => patch({ weightKg: Math.max(30, draft.weightKg - 0.5) })}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    step="0.1"
                    className="h-14 text-lg text-center rounded-2xl bg-zinc-950/60 border-white/10 tabular-nums"
                    value={draft.weightKg}
                    onChange={(e) => patch({ weightKg: Number(e.target.value) || 0 })}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => patch({ weightKg: Math.min(300, draft.weightKg + 0.5) })}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white px-1">Trainingsziel</h2>
              {GOALS.map((g) => (
                <OptionCard
                  key={g.key}
                  selected={draft.goal === g.key}
                  onClick={() => patch({ goal: g.key })}
                  label={g.label}
                  hint={g.desc}
                  icon={g.icon}
                />
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-white px-1">Erfahrungslevel</h2>
              {EXPERIENCE.map((e) => (
                <OptionCard
                  key={e.key}
                  selected={draft.experience === e.key}
                  onClick={() => patch({ experience: e.key })}
                  label={e.label}
                  hint={e.hint}
                />
              ))}
            </div>
          )}

          {step === 6 && (
            <GlassCard className="space-y-5 text-center">
              <h2 className="text-xl font-bold text-white">Trainingstage pro Woche</h2>
              <p className="text-4xl font-bold text-cyan-400 tabular-nums">{draft.trainingDays}</p>
              <div className="flex items-center justify-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  disabled={draft.trainingDays <= 1}
                  onClick={() => patch({ trainingDays: draft.trainingDays - 1 })}
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <Scale className="h-6 w-6 text-zinc-500" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  disabled={draft.trainingDays >= 7}
                  onClick={() => patch({ trainingDays: draft.trainingDays + 1 })}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500">1–7 Trainingstage</p>
            </GlassCard>
          )}

          {step === 7 && (
            <GlassCard className="space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-400" />
                Account erstellen
              </h2>
              <div>
                <Label className="text-zinc-400">E-Mail</Label>
                <Input
                  type="email"
                  className="mt-1.5 h-12 rounded-xl bg-zinc-950/60 border-white/10"
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  autoComplete="email"
                />
              </div>
              <div>
                <Label className="text-zinc-400">Passwort</Label>
                <Input
                  type="password"
                  className="mt-1.5 h-12 rounded-xl bg-zinc-950/60 border-white/10"
                  value={draft.password}
                  onChange={(e) => patch({ password: e.target.value })}
                  autoComplete="new-password"
                />
                {draft.password && (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div className={cn("h-full transition-all", strength.color)} style={{ width: `${strength.score}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{strength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-zinc-400">Passwort wiederholen</Label>
                <Input
                  type="password"
                  className="mt-1.5 h-12 rounded-xl bg-zinc-950/60 border-white/10"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.acceptTerms}
                  onChange={(e) => patch({ acceptTerms: e.target.checked })}
                  className="mt-1 accent-cyan-400"
                />
                <span>
                  Ich akzeptiere die{" "}
                  <Link href="/settings/support" className="text-cyan-400 underline">
                    AGB & Datenschutz
                  </Link>
                </span>
              </label>
            </GlassCard>
          )}

          {step === 8 && (
            <GlassCard className="space-y-4">
              <h2 className="text-xl font-bold text-white">Zusammenfassung</h2>
              <ul className="text-sm text-zinc-400 space-y-1.5">
                <li><span className="text-zinc-600">Name:</span> {draft.firstName} {draft.lastName}</li>
                <li><span className="text-zinc-600">Alter:</span> {draft.age} · {draft.gender === "MALE" ? "Männlich" : draft.gender === "FEMALE" ? "Weiblich" : "Divers"}</li>
                <li><span className="text-zinc-600">Körper:</span> {draft.heightCm} cm · {draft.weightKg} kg</li>
                <li><span className="text-zinc-600">Ziel:</span> {GOALS.find((g) => g.key === draft.goal)?.label}</li>
                <li><span className="text-zinc-600">Level:</span> {EXPERIENCE.find((e) => e.key === draft.experience)?.label}</li>
                <li><span className="text-zinc-600">Training:</span> {draft.trainingDays}× / Woche</li>
                <li><span className="text-zinc-600">E-Mail:</span> {draft.email}</li>
              </ul>
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-center">
                <p className="text-xs uppercase text-zinc-500">Dein Kalorienziel</p>
                <p className="text-4xl font-bold text-cyan-400 tabular-nums mt-1">{calories.calorieTarget}</p>
                <p className="text-sm text-zinc-400">kcal / Tag</p>
                <p className="text-[10px] text-zinc-600 mt-2">
                  BMR {calories.bmr} · TDEE {calories.tdee} (Mifflin-St Jeor)
                </p>
              </div>
            </GlassCard>
          )}
        </div>

        <div className="flex gap-3 pt-6 mt-auto">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-2xl border-white/10"
              disabled={submitting}
              onClick={() => go(step - 1, "back")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              className={cn("h-12 rounded-2xl btn-accent font-semibold flex-1", step === 1 && "w-full")}
              disabled={!canContinue}
              onClick={() => go(step + 1)}
            >
              Weiter
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 rounded-2xl btn-accent font-semibold flex-1"
              disabled={submitting}
              onClick={() => void createAccount()}
            >
              {submitting ? "Erstelle Account…" : "Account erstellen"}
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500 mt-4">
          Bereits registriert?{" "}
          <Link href="/login" className="text-cyan-400 hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
