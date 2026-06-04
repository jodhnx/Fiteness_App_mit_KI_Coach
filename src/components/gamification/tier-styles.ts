import type { BadgeTier } from "@/lib/achievement-catalog";

export const TIER_RING: Record<string, string> = {
  bronze: "from-amber-700 to-amber-900",
  silver: "from-zinc-300 to-zinc-500",
  gold: "from-yellow-400 to-amber-600",
  platinum: "from-slate-200 to-slate-400",
  diamond: "from-cyan-200 to-blue-400",
  legendary: "from-violet-400 via-fuchsia-500 to-amber-400",
};

export function tierGradient(tier: string) {
  return TIER_RING[tier] ?? TIER_RING.bronze;
}

export const PERIOD_LABELS: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};
