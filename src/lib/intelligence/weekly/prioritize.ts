import type { IntelligenceRecommendation } from "@/lib/intelligence/types";

function scoreWeekly(r: IntelligenceRecommendation): number {
  let score = r.priority === "primary" ? 80 : 45;
  if (r.id.includes("training-completion")) score += 25;
  if (r.id.includes("protein-consistency")) score += 20;
  if (r.id.startsWith("weekly-pr")) score += 30;
  if (r.id.includes("training-plan")) score += 15;
  if (r.type === "achievement") score += 10;
  if (r.id.includes("stable") || r.id.includes("steps-good")) score -= 5;
  return score;
}

export function prioritizeWeeklyInsights(
  candidates: IntelligenceRecommendation[],
  recommendations: IntelligenceRecommendation[]
): {
  primary: IntelligenceRecommendation | null;
  secondary: IntelligenceRecommendation[];
  recommendations: IntelligenceRecommendation[];
} {
  const byId = new Map<string, IntelligenceRecommendation>();
  for (const c of candidates) {
    const prev = byId.get(c.id);
    if (!prev || scoreWeekly(c) > scoreWeekly(prev)) byId.set(c.id, c);
  }

  const ranked = [...byId.values()].sort(
    (a, b) => scoreWeekly(b) - scoreWeekly(a)
  );

  const primary = ranked[0]
    ? { ...ranked[0], priority: "primary" as const }
    : null;
  const secondary = ranked
    .slice(1, 3)
    .map((r) => ({ ...r, priority: "secondary" as const }));

  const mergedRecs = [
    ...recommendations,
    ...ranked.filter((r) => r.id.includes("rec") || r.id.includes("plan")),
  ]
    .filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i)
    .slice(0, 3);

  return { primary, secondary, recommendations: mergedRecs.length ? mergedRecs : ranked.slice(0, 3).map((r) => ({ ...r, priority: "secondary" as const })) };
}
