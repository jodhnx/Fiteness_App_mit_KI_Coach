"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type Ring = { value: number; goal: number; pct: number };

type Props = {
  move: Ring;
  exercise: Ring;
  steps: Ring;
};

function RingSvg({
  pct,
  color,
  label,
  value,
  unit,
}: {
  pct: number;
  color: string;
  label: string;
  value: string;
  unit: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-200"
        />
      </svg>
      <p className="text-[10px] text-zinc-500 uppercase mt-1">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-zinc-600">{unit}</p>
    </div>
  );
}

export const ActivityRings = memo(function ActivityRings({ move, exercise, steps }: Props) {
  return (
    <div className={cn("card-premium p-5 flex justify-around")}>
      <RingSvg
        pct={move.pct}
        color="var(--accent)"
        label="Bewegung"
        value={String(move.value)}
        unit={`/ ${move.goal} kcal`}
      />
      <RingSvg
        pct={exercise.pct}
        color="#a855f7"
        label="Aktiv"
        value={String(exercise.value)}
        unit={`/ ${exercise.goal} min`}
      />
      <RingSvg
        pct={steps.pct}
        color="#34d399"
        label="Schritte"
        value={steps.value.toLocaleString("de-AT")}
        unit={`/ ${steps.goal.toLocaleString("de-AT")}`}
      />
    </div>
  );
});
