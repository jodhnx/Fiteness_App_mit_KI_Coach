import type { IntelligenceRecommendation } from "@/lib/intelligence/types";

/** Score candidates — higher wins primary slot. */
const TYPE_BOOST: Partial<Record<IntelligenceRecommendation["type"], number>> = {
  nutrition: 5,
  training: 3,
  achievement: 8,
  progress: 6,
  weight: 2,
  recovery: 1,
  activity: 0,
};

function scoreRecommendation(r: IntelligenceRecommendation): number {
  let score = r.priority === "primary" ? 80 : 40;
  if (r.id.includes("protein")) score += 25;
  if (r.id.includes("training-pending")) score += 20;
  if (r.id.includes("progress-pr")) score += 30;
  if (r.id.includes("weight-plateau")) score += 10;
  if (r.id.includes("streak") || r.id.includes("trend-good")) score -= 5;
  score += TYPE_BOOST[r.type] ?? 0;
  return score;
}

export function prioritizeRecommendations(
  candidates: IntelligenceRecommendation[]
): {
  primary: IntelligenceRecommendation | null;
  secondary: IntelligenceRecommendation[];
} {
  const byId = new Map<string, IntelligenceRecommendation>();
  for (const c of candidates) {
    const prev = byId.get(c.id);
    if (!prev || scoreRecommendation(c) > scoreRecommendation(prev)) {
      byId.set(c.id, c);
    }
  }

  const unique = [...byId.values()].sort(
    (a, b) => scoreRecommendation(b) - scoreRecommendation(a)
  );

  if (unique.length === 0) {
    return { primary: null, secondary: [] };
  }

  const primary = { ...unique[0]!, priority: "primary" as const };
  const secondary = unique
    .slice(1, 3)
    .map((r) => ({ ...r, priority: "secondary" as const }));

  return { primary, secondary };
}

export function buildAllGoodRecommendation(): IntelligenceRecommendation {
  return {
    id: "all-good",
    type: "achievement",
    priority: "primary",
    title: "Heute im Plan",
    description: "Ernährung und Training sind auf Kurs — weiter so.",
    action: { label: "Coach öffnen", href: "/coach" },
  };
}
