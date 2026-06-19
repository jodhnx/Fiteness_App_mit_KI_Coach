"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_GENDER_OPTIONS,
  ONBOARDING_ACTIVITY_SIMPLE,
  ONBOARDING_GOAL_SIMPLE,
  ONBOARDING_WELCOME_FEATURES,
  defaultNutritionGoalForMainGoal,
  type MainGoalKey,
} from "@/lib/onboarding-options";
import type { ActivityLevel, Gender } from "@prisma/client";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  LineChart,
  Sparkles,
  Trophy,
  Utensils,
} from "lucide-react";

const TOTAL_STEPS = 5;

const FEATURE_ICONS = {
  brain: Brain,
  utensils: Utensils,
  dumbbell: Dumbbell,
  chart: LineChart,
  trophy: Trophy,
} as const;

function OptionButton({
  selected,
  onClick,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98]",
        selected
          ? "border-cyan-500/50 bg-cyan-500/15 text-white shadow-lg shadow-cyan-500/10"
          : "border-zinc-700/80 bg-zinc-900/60 text-zinc-300"
      )}
    >
      <span className="font-semibold block text-base">{label}</span>
      {hint && <span className="text-sm text-zinc-500 mt-1 block">{hint}</span>}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    calorieTarget: number;
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
    estimatedGoalWeeks: number;
    recommendedTrainingDays: number;
  } | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [mainGoalKey, setMainGoalKey] = useState<MainGoalKey | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (d.completed) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  function next() {
    if (step === 4) {
      void finish();
      return;
    }
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }

  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function canContinue(): boolean {
    switch (step) {
      case 1:
        return true;
      case 2:
        return (
          name.trim().length >= 2 &&
          gender != null &&
          !!age &&
          Number(age) >= 14 &&
          Number(age) <= 100 &&
          !!heightCm &&
          Number(heightCm) > 0 &&
          !!weightKg &&
          Number(weightKg) > 0
        );
      case 3:
        return mainGoalKey != null;
      case 4:
        return activityLevel != null;
      default:
        return false;
    }
  }

  async function finish() {
    if (!canContinue() || !gender || !activityLevel || !mainGoalKey) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }
    const nutritionGoal = defaultNutritionGoalForMainGoal(mainGoalKey);
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          gender,
          age: Number(age),
          heightCm: Number(heightCm),
          weightKg: Number(weightKg),
          activityLevel,
          mainGoalKey,
          experienceLevel: "BEGINNER",
          nutritionGoal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setResult(data.calculations);
      await update({ onboardingComplete: true });
      toast.success("Dein Plan ist bereit!");
      setStep(5);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (step === 5 && result) {
    const months = Math.max(1, Math.round(result.estimatedGoalWeeks / 4));
    return (
      <div className="gradient-mesh min-h-[100dvh] flex flex-col p-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="text-center mb-6">
            <Sparkles className="h-12 w-12 text-cyan-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Dein persönlicher Plan</h1>
            <p className="text-zinc-400 mt-2 text-sm">
              Basierend auf deinen Angaben — jederzeit in den Einstellungen anpassbar.
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-500/25 bg-zinc-900/80 p-5 space-y-4">
            <div className="text-center py-2">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Kalorienziel</p>
              <p className="text-4xl font-bold text-cyan-400 tabular-nums mt-1">
                {result.calorieTarget}
              </p>
              <p className="text-sm text-zinc-400">kcal / Tag</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-zinc-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-zinc-500">Protein</p>
                <p className="text-lg font-bold text-white tabular-nums">{result.proteinTargetG}g</p>
              </div>
              <div className="rounded-2xl bg-zinc-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-zinc-500">KH</p>
                <p className="text-lg font-bold text-white tabular-nums">{result.carbsTargetG}g</p>
              </div>
              <div className="rounded-2xl bg-zinc-800/80 p-3 text-center">
                <p className="text-[10px] uppercase text-zinc-500">Fett</p>
                <p className="text-lg font-bold text-white tabular-nums">{result.fatTargetG}g</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <p className="text-sm text-zinc-400">Geschätzte Dauer bis zum Ziel</p>
              <p className="text-xl font-semibold text-white mt-1">
                ca. {result.estimatedGoalWeeks} Wochen ({months} Monate)
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Empfohlen: {result.recommendedTrainingDays}× Training pro Woche
              </p>
            </div>
          </div>

          <Button
            className="w-full h-14 text-base font-semibold mt-6 rounded-2xl btn-accent"
            onClick={() => router.push("/home")}
          >
            Los geht&apos;s
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-[100dvh] flex flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {step > 1 && step < 5 && (
          <div className="mb-5">
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
                style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              Schritt {step - 1} von {TOTAL_STEPS - 1}
            </p>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {step === 1 && (
            <div className="flex-1 flex flex-col justify-center space-y-6">
              <div className="text-center">
                <p className="text-cyan-400 font-semibold tracking-widest text-xs uppercase mb-2">
                  Willkommen bei
                </p>
                <h1 className="text-4xl font-bold text-white">NEXFORM</h1>
                <p className="text-zinc-400 mt-3 text-sm leading-relaxed">
                  Dein smarter Fitness-Begleiter — trainieren, essen, wachsen.
                </p>
              </div>

              <div className="space-y-3">
                {ONBOARDING_WELCOME_FEATURES.map((f) => {
                  const Icon = FEATURE_ICONS[f.icon];
                  return (
                    <div
                      key={f.title}
                      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/50 p-4"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{f.title}</p>
                        <p className="text-sm text-zinc-500">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Erzähl uns etwas über dich</h2>
                <p className="text-zinc-500 text-sm mt-1">Für deinen personalisierten Plan</p>
              </div>

              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  className="mt-1.5 h-12 text-base"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Vorname"
                  autoComplete="name"
                />
              </div>

              <div>
                <Label>Geschlecht</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {ONBOARDING_GENDER_OPTIONS.map((o) => (
                    <OptionButton
                      key={o.value}
                      selected={gender === o.value}
                      onClick={() => setGender(o.value)}
                      label={o.label}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="age">Alter</Label>
                  <Input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    className="mt-1.5 h-12"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="28"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Größe</Label>
                  <Input
                    id="height"
                    type="number"
                    className="mt-1.5 h-12"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="175"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Gewicht</Label>
                  <Input
                    id="weight"
                    type="number"
                    className="mt-1.5 h-12"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="75"
                  />
                </div>
              </div>
              <p className="text-[10px] text-zinc-600">Größe in cm · Gewicht in kg</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Dein Ziel</h2>
                <p className="text-zinc-500 text-sm mt-1">Was möchtest du erreichen?</p>
              </div>
              <div className="space-y-2">
                {ONBOARDING_GOAL_SIMPLE.map((o) => (
                  <OptionButton
                    key={o.key}
                    selected={mainGoalKey === o.key}
                    onClick={() => setMainGoalKey(o.key)}
                    label={o.label}
                    hint={o.description}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Deine Aktivität</h2>
                <p className="text-zinc-500 text-sm mt-1">Wie aktiv bist du im Alltag?</p>
              </div>
              <div className="space-y-2">
                {ONBOARDING_ACTIVITY_SIMPLE.map((o) => (
                  <OptionButton
                    key={o.value}
                    selected={activityLevel === o.value}
                    onClick={() => setActivityLevel(o.value)}
                    label={o.label}
                    hint={o.hint}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-6 mt-auto">
          {step > 1 && step < 5 && (
            <Button type="button" variant="outline" className="h-12 flex-1 rounded-2xl" onClick={back}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
          )}
          <Button
            type="button"
            className={cn("h-12 rounded-2xl btn-accent font-semibold", step === 1 ? "w-full" : "flex-1")}
            disabled={step > 1 && step < 5 && (!canContinue() || loading)}
            onClick={next}
          >
            {loading ? "Berechne…" : step === 1 ? "Loslegen" : step === 4 ? "Plan erstellen" : "Weiter"}
            {!loading && step !== 4 && step !== 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
