"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthFlowSteps } from "@/components/auth/auth-flow-steps";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_GENDER_OPTIONS,
  ONBOARDING_ACTIVITY_OPTIONS,
  ONBOARDING_MAIN_GOAL_UI,
  ONBOARDING_EXPERIENCE_OPTIONS,
  defaultNutritionGoalForMainGoal,
  type MainGoalKey,
} from "@/lib/onboarding-options";
import type { ActivityLevel, Gender, PlanLevel } from "@prisma/client";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const TOTAL_STEPS = 7;

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
        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
        selected
          ? "border-accent bg-accent-soft text-white"
          : "border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
      )}
    >
      <span className="font-medium block">{label}</span>
      {hint && <span className="text-xs text-zinc-500 mt-0.5 block">{hint}</span>}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    bmi: number;
    calorieTarget: number;
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
    recommendedTrainingDays: number;
  } | null>(null);

  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [mainGoalKey, setMainGoalKey] = useState<MainGoalKey | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<PlanLevel | null>(null);
  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((d) => {
        if (d.completed) router.replace("/home");
      })
      .catch(() => {});
  }, [router]);

  function next() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }
  function back() {
    if (step > 1) setStep((s) => s - 1);
  }

  function canContinue(): boolean {
    switch (step) {
      case 1:
        return gender != null;
      case 2:
        return !!age && Number(age) >= 14 && Number(age) <= 100;
      case 3:
        return !!heightCm && Number(heightCm) > 0;
      case 4:
        return !!weightKg && Number(weightKg) > 0;
      case 5:
        return activityLevel != null;
      case 6:
        return mainGoalKey != null;
      case 7:
        return experienceLevel != null;
      default:
        return false;
    }
  }

  async function finish() {
    if (!canContinue() || !gender || !activityLevel || !mainGoalKey || !experienceLevel) {
      toast.error("Bitte alle Fragen beantworten");
      return;
    }
    const nutritionGoal = mainGoalKey
      ? defaultNutritionGoalForMainGoal(mainGoalKey)
      : "MAINTENANCE";
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          age: Number(age),
          heightCm: Number(heightCm),
          weightKg: Number(weightKg),
          activityLevel,
          mainGoalKey,
          experienceLevel,
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
      setStep(10);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  if (step === 10 && result) {
    return (
      <div className="gradient-mesh min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Sparkles className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
            <CardTitle>Alles bereit!</CardTitle>
            <CardDescription>Deine persönlichen Ziele wurden berechnet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-zinc-800/80 p-3 text-center">
                <p className="text-zinc-500 text-xs">BMI</p>
                <p className="text-xl font-bold text-white">{result.bmi}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/80 p-3 text-center">
                <p className="text-zinc-500 text-xs">Kalorien</p>
                <p className="text-xl font-bold text-white">{result.calorieTarget}</p>
              </div>
              <div className="rounded-lg bg-zinc-800/80 p-3 text-center">
                <p className="text-zinc-500 text-xs">Protein</p>
                <p className="text-xl font-bold text-white">{result.proteinTargetG} g</p>
              </div>
              <div className="rounded-lg bg-zinc-800/80 p-3 text-center">
                <p className="text-zinc-500 text-xs">Training/Woche</p>
                <p className="text-xl font-bold text-white">{result.recommendedTrainingDays}×</p>
              </div>
            </div>
            <p className="text-zinc-500 text-center text-xs">
              KH {result.carbsTargetG} g · Fett {result.fatTargetG} g
            </p>
            <Button className="w-full mt-4" onClick={() => router.push("/home")}>
              Zur App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="gradient-mesh min-h-screen flex flex-col items-center p-4 pb-8">
      <div className="w-full max-w-md pt-6">
        <AuthFlowSteps current={3} />
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-center">
            Schritt {step} von {TOTAL_STEPS}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {step === 1 && "Geschlecht"}
              {step === 2 && "Alter"}
              {step === 3 && "Größe"}
              {step === 4 && "Gewicht"}
              {step === 5 && "Aktivitätslevel"}
              {step === 6 && "Hauptziel"}
              {step === 7 && "Trainingserfahrung"}
            </CardTitle>
            <CardDescription>
              Einmalig nach der Registrierung — danach direkt zum Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {step === 1 &&
              ONBOARDING_GENDER_OPTIONS.map((o) => (
                <OptionButton
                  key={o.value}
                  selected={gender === o.value}
                  onClick={() => setGender(o.value)}
                  label={o.label}
                />
              ))}

            {step === 2 && (
              <div>
                <Label htmlFor="age">Alter (Jahre)</Label>
                <Input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  className="mt-2 text-lg h-12"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="z. B. 28"
                />
              </div>
            )}

            {step === 3 && (
              <div>
                <Label htmlFor="height">Größe (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  className="mt-2 text-lg h-12"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="z. B. 175"
                />
              </div>
            )}

            {step === 4 && (
              <div>
                <Label htmlFor="weight">Gewicht (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  className="mt-2 text-lg h-12"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="z. B. 75"
                />
              </div>
            )}

            {step === 5 &&
              ONBOARDING_ACTIVITY_OPTIONS.map((o) => (
                <OptionButton
                  key={o.value}
                  selected={activityLevel === o.value}
                  onClick={() => setActivityLevel(o.value)}
                  label={o.label}
                  hint={o.hint}
                />
              ))}

            {step === 6 &&
              ONBOARDING_MAIN_GOAL_UI.map((o) => (
                <OptionButton
                  key={o.key}
                  selected={mainGoalKey === o.key}
                  onClick={() => setMainGoalKey(o.key)}
                  label={o.label}
                />
              ))}

            {step === 7 &&
              ONBOARDING_EXPERIENCE_OPTIONS.map((o) => (
                <OptionButton
                  key={o.value}
                  selected={experienceLevel === o.value}
                  onClick={() => setExperienceLevel(o.value)}
                  label={o.label}
                />
              ))}

            <div className="flex gap-2 pt-4">
              {step > 1 && (
                <Button type="button" variant="outline" className="flex-1" onClick={back}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Zurück
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!canContinue()}
                  onClick={next}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!canContinue() || loading}
                  onClick={finish}
                >
                  {loading ? "Berechne…" : "Abschließen"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
