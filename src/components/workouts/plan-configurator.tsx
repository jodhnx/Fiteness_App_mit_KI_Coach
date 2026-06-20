"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import { StepIndicator, GlassCard } from "@/components/onboarding/step-indicator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { recommendCatalogPlans } from "@/lib/plan-science-engine";
import {
  type PlanConfiguratorInput,
  mapConfiguratorToRecommendInput,
  CONFIG_GOALS,
  CONFIG_LOCATIONS,
  CONFIG_EXPERIENCE,
  CONFIG_DURATIONS,
  CONFIG_DAYS,
  CONFIG_STYLES,
  CONFIG_FOCUS,
  CONFIG_EQUIPMENT,
} from "@/lib/plan-configurator";
import { ChevronLeft, ChevronRight, Sparkles, Check } from "lucide-react";
import { invalidateCache } from "@/lib/client-cache";
import { CACHE_KEYS } from "@/lib/cache-manager";

const TOTAL = 8;

const DEFAULT: PlanConfiguratorInput = {
  goal: "MUSCLE_GAIN",
  location: "GYM",
  experience: "BEGINNER",
  durationMinutes: 60,
  daysPerWeek: 4,
  style: "MIXED",
  focus: "FULL_BODY",
  equipment: "FULL_GYM",
};

function OptionBtn({
  selected,
  onClick,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  desc?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-4 text-left",
        selected
          ? "border-cyan-400/50 bg-cyan-500/15 text-white"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-300"
      )}
    >
      <span className="font-semibold block">{label}</span>
      {desc && <span className="text-xs text-zinc-500 mt-0.5 block">{desc}</span>}
    </button>
  );
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-xl border py-3 px-3 text-sm font-medium",
            value === o.id
              ? "border-cyan-400/60 bg-cyan-500/15 text-white"
              : "border-zinc-800 text-zinc-400"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PlanConfigurator() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<PlanConfiguratorInput>(DEFAULT);
  const [adopting, setAdopting] = useState(false);

  const patch = useCallback((p: Partial<PlanConfiguratorInput>) => {
    setConfig((prev) => ({ ...prev, ...p }));
  }, []);

  const recommendation = useMemo(() => {
    if (step < TOTAL) return null;
    const input = mapConfiguratorToRecommendInput(config);
    const ranked = recommendCatalogPlans(input);
    return ranked[0] ?? null;
  }, [config, step]);

  async function adoptPlan() {
    if (!recommendation) return;
    setAdopting(true);
    try {
      const res = await fetch("/api/workouts/plans/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogKey: recommendation.catalogKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Plan konnte nicht erstellt werden");
        return;
      }
      invalidateCache(CACHE_KEYS.PLANS_LIST);
      toast.success(`${recommendation.name} wurde erstellt`);
      router.push(`/workouts/plans/${data.plan.id}/days`);
    } finally {
      setAdopting(false);
    }
  }

  const stepLabels = [
    "Ziel",
    "Ort",
    "Level",
    "Dauer",
    "Tage/Woche",
    "Stil",
    "Fokus",
    "Equipment",
  ];

  return (
    <div className="space-y-5 pb-28 max-w-lg mx-auto">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white">Plan-Konfigurator</h1>
        <p className="text-sm text-zinc-500 mt-1">Dein optimaler Trainingsplan in 8 Schritten</p>
      </div>

      {step <= TOTAL && (
        <StepIndicator step={step} total={TOTAL} label={stepLabels[step - 1]} />
      )}

      {step === 1 && (
        <div className="space-y-2">
          {CONFIG_GOALS.map((g) => (
            <OptionBtn
              key={g.id}
              selected={config.goal === g.id}
              onClick={() => patch({ goal: g.id })}
              label={g.label}
              desc={g.desc}
            />
          ))}
        </div>
      )}

      {step === 2 && (
        <GlassCard>
          <p className="text-sm text-zinc-400 mb-3">Wo trainierst du?</p>
          <ChipGrid options={CONFIG_LOCATIONS} value={config.location} onChange={(v) => patch({ location: v })} />
        </GlassCard>
      )}

      {step === 3 && (
        <GlassCard>
          <ChipGrid options={CONFIG_EXPERIENCE} value={config.experience} onChange={(v) => patch({ experience: v })} />
        </GlassCard>
      )}

      {step === 4 && (
        <GlassCard className="text-center space-y-4">
          <p className="text-4xl font-bold text-cyan-400 tabular-nums">{config.durationMinutes} min</p>
          <div className="grid grid-cols-2 gap-2">
            {CONFIG_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => patch({ durationMinutes: d })}
                className={cn(
                  "rounded-xl border py-3 font-semibold",
                  config.durationMinutes === d
                    ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                    : "border-zinc-800 text-zinc-400"
                )}
              >
                {d} Min
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {step === 5 && (
        <GlassCard className="text-center space-y-4">
          <p className="text-4xl font-bold text-cyan-400 tabular-nums">{config.daysPerWeek}×</p>
          <div className="flex flex-wrap justify-center gap-2">
            {CONFIG_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => patch({ daysPerWeek: d })}
                className={cn(
                  "h-12 w-12 rounded-full border font-bold",
                  config.daysPerWeek === d
                    ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                    : "border-zinc-800 text-zinc-400"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {step === 6 && (
        <ChipGrid options={CONFIG_STYLES} value={config.style} onChange={(v) => patch({ style: v })} />
      )}

      {step === 7 && (
        <div className="grid grid-cols-2 gap-2">
          {CONFIG_FOCUS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => patch({ focus: f.id })}
              className={cn(
                "rounded-xl border py-3 text-sm font-medium",
                config.focus === f.id
                  ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                  : "border-zinc-800 text-zinc-400"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {step === 8 && (
        <div className="space-y-2">
          {CONFIG_EQUIPMENT.map((e) => (
            <OptionBtn
              key={e.id}
              selected={config.equipment === e.id}
              onClick={() => patch({ equipment: e.id })}
              label={e.label}
            />
          ))}
        </div>
      )}

      {step === TOTAL + 1 && recommendation && (
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Empfohlener Plan</span>
          </div>
          <h2 className="text-2xl font-bold text-white">{recommendation.name}</h2>
          <p className="text-sm text-zinc-400">{recommendation.description}</p>
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 space-y-2">
            <p className="text-xs text-zinc-500 uppercase">Warum dieser Plan?</p>
            <ul className="space-y-1.5">
              {recommendation.scores.rationale.map((line) => (
                <li key={line} className="text-sm text-zinc-300 flex gap-2">
                  <Check className="h-4 w-4 text-[#4CAF50] shrink-0 mt-0.5" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-zinc-600">
            {recommendation.daysPerWeek} Tage/Woche · {recommendation.durationMinutes} min · Score{" "}
            {Math.round(recommendation.scores.totalScore)}
          </p>
          <Button className="w-full h-14 rounded-2xl" disabled={adopting} onClick={() => void adoptPlan()}>
            {adopting ? "Erstelle Plan…" : "Plan übernehmen"}
          </Button>
        </GlassCard>
      )}

      <div className="flex gap-3">
        {step > 1 && step <= TOTAL + 1 && (
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-2xl"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
        )}
        {step <= TOTAL && (
          <Button
            className="flex-1 h-12 rounded-2xl btn-accent"
            onClick={() => setStep((s) => s + 1)}
          >
            {step === TOTAL ? "Plan finden" : "Weiter"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
