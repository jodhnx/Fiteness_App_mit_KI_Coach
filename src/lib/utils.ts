import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Untergewicht";
  if (bmi < 25) return "Normalgewicht";
  if (bmi < 30) return "Übergewicht";
  return "Adipositas";
}

import { getLevelFromXP as getLevelFromXPComputed } from "@/lib/level-system";

/** @deprecated Use `@/lib/level-system` — kept for legacy callers with DB levels */
export function getLevelFromXP(
  totalXP: number,
  levels?: { id: number; name: string; minXP: number; maxXP: number }[]
) {
  if (!levels?.length) return getLevelFromXPComputed(totalXP);
  const sorted = [...levels].sort((a, b) => b.minXP - a.minXP);
  const legacy = sorted.find((l) => totalXP >= l.minXP) ?? levels[0];
  const computed = getLevelFromXPComputed(totalXP);
  return {
    ...computed,
    id: legacy.id,
    name: computed.name,
  };
}

export function formatDateDE(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}
