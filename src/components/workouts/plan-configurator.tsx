"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  CONFIG_FOCUS,
} from "@/lib/plan-configurator";
import { Sparkles, Check } from "lucide-react";
import { invalidateCache } from "@/lib/client-cache";
import { CACHE_KEYS } from "@/lib/cache-manager";

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

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        cols === 3 ? "grid-cols-3" : cols === 4 ? "grid-cols-4" : "grid-cols-2"
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-xl border py-2.5 px-2 text-sm font-medium",
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

type Props = {
  /** Hide page title when embedded in catalog */
  embedded?: boolean;
};

export function PlanConfigurator({ embedded = false }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<PlanConfiguratorInput>(DEFAULT);
  const [adopting, setAdopting] = useState(false);
  const [generated, setGenerated] = useState(false);

  const patch = useCallback((p: Partial<PlanConfiguratorInput>) => {
    setConfig((prev) => ({ ...prev, ...p }));
    setGenerated(false);
  }, []);

  const recommendation = useMemo(() => {
    if (!generated) return null;
    const input = mapConfiguratorToRecommendInput(config);
    const ranked = recommendCatalogPlans(input);
    return ranked[0] ?? null;
  }, [config, generated]);

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

  function handleGenerate() {
    setGenerated(true);
    const input = mapConfiguratorToRecommendInput(config);
    const ranked = recommendCatalogPlans(input);
    if (!ranked[0]) {
      toast.error("Kein passender Plan gefunden");
    }
  }

  return (
    <div className={cn("space-y-5", !embedded && "pb-28 max-w-lg mx-auto")}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold text-white">Plan-Konfigurator</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Antworten auswählen — wir finden deinen optimalen Plan
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-5">
        {embedded && (
          <div>
            <h2 className="text-lg font-bold text-white">Plan-Konfigurator</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ziel, Ort, Level, Tage, Fokus & Zeit — dann Plan generieren
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Ziel</p>
          <div className="grid grid-cols-1 gap-2">
            {CONFIG_GOALS.slice(0, 4).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => patch({ goal: g.id })}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm",
                  config.goal === g.id
                    ? "border-cyan-400/50 bg-cyan-500/15 text-white"
                    : "border-zinc-800 text-zinc-400"
                )}
              >
                <span className="font-semibold">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Gym oder Zuhause
          </p>
          <ChipGrid options={CONFIG_LOCATIONS} value={config.location} onChange={(v) => patch({ location: v })} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Erfahrung</p>
          <ChipGrid options={CONFIG_EXPERIENCE} value={config.experience} onChange={(v) => patch({ experience: v })} cols={3} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Trainingstage</p>
          <div className="flex flex-wrap gap-2">
            {CONFIG_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => patch({ daysPerWeek: d })}
                className={cn(
                  "h-11 w-11 rounded-full border font-bold text-sm",
                  config.daysPerWeek === d
                    ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                    : "border-zinc-800 text-zinc-400"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fokus</p>
          <ChipGrid options={CONFIG_FOCUS} value={config.focus} onChange={(v) => patch({ focus: v })} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Zeit pro Training
          </p>
          <div className="grid grid-cols-4 gap-2">
            {CONFIG_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => patch({ durationMinutes: d })}
                className={cn(
                  "rounded-xl border py-2.5 text-sm font-semibold",
                  config.durationMinutes === d
                    ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                    : "border-zinc-800 text-zinc-400"
                )}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          className="w-full h-14 rounded-2xl btn-accent text-base font-bold"
          onClick={handleGenerate}
        >
          <Sparkles className="h-5 w-5 mr-2" />
          Perfekten Plan generieren
        </Button>
      </div>

      {recommendation && (
        <div className="rounded-2xl border border-cyan-500/30 bg-zinc-900/80 p-4 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Empfohlener Plan</span>
          </div>
          <h3 className="text-xl font-bold text-white">{recommendation.name}</h3>
          <p className="text-sm text-zinc-400">{recommendation.description}</p>
          <ul className="space-y-1">
            {recommendation.scores.rationale.slice(0, 2).map((line) => (
              <li key={line} className="text-xs text-zinc-400 flex gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                {line}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="w-full h-12 rounded-xl"
            disabled={adopting}
            onClick={() => void adoptPlan()}
          >
            {adopting ? "Erstelle Plan…" : "Plan übernehmen"}
          </Button>
        </div>
      )}
    </div>
  );
}
