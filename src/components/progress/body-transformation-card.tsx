"use client";

import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import type { BodyTransformation } from "@/lib/body-transformation";

function fmt(kg: number | null) {
  if (kg == null) return "—";
  const sign = kg > 0 ? "+" : "";
  return `${sign}${kg.toLocaleString("de-AT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

export function BodyTransformationCard({ data }: { data: BodyTransformation }) {
  return (
    <div className="card-premium p-5 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        Body Transformation
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] text-zinc-500">Start</p>
          <p className="text-xl font-bold text-white tabular-nums">{data.startKg} kg</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Aktuell</p>
          <p className="text-xl font-bold text-accent tabular-nums">{data.currentKg} kg</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Ziel</p>
          <p className="text-xl font-bold text-white tabular-nums">
            {data.targetKg ?? "—"}
            {data.targetKg != null && <span className="text-sm text-zinc-500"> kg</span>}
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-zinc-400 mb-1">
          <span>Fortschritt zum Ziel</span>
          <span className="font-semibold text-white tabular-nums">{data.progressPercent}%</span>
        </div>
        <MacroProgressBar
          consumed={data.progressPercent}
          target={100}
          className="h-2"
        />
        <p className="text-[11px] text-zinc-500 mt-1.5">
          Gesamt {fmt(data.changeTotalKg)}
          {data.targetKg != null && ` · Differenz zum Ziel ${fmt(data.currentKg - data.targetKg)}`}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-zinc-500">Woche</p>
          <p className="font-semibold text-white tabular-nums">{fmt(data.changeWeekKg)}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-zinc-500">Monat</p>
          <p className="font-semibold text-white tabular-nums">{fmt(data.changeMonthKg)}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-zinc-500">Gesamt</p>
          <p className="font-semibold text-white tabular-nums">{fmt(data.changeTotalKg)}</p>
        </div>
      </div>

      {data.forecastText && (
        <p className="text-xs text-violet-300/90 leading-snug">{data.forecastText}</p>
      )}
    </div>
  );
}
