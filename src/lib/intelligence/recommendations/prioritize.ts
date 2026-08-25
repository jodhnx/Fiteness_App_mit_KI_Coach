import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";

const TYPE_BOOST: Partial<Record<AdaptiveRecommendation["type"], number>> = {
  nutrition: 25,
  planning: 22,
  training: 18,
  weight: 15,
  goal: 5,
  recovery: 10,
  progress: 8,
  consistency: 3,
};

function scoreRecommendation(r: AdaptiveRecommendation): number {
  let score = r.priority === "primary" ? 80 : 40;
  const confBoost = r.confidence === "high" ? 15 : r.confidence === "medium" ? 8 : 0;
  score += confBoost;
  score += TYPE_BOOST[r.type] ?? 0;
  if (r.id.includes("missed") || r.id.includes("protein-low")) score += 20;
  if (r.id.includes("plateau-nutrition")) score += 18;
  if (r.id.includes("on-track") || r.id.includes("on-plan") || r.id.includes("improving")) score -= 12;
  if (r.confidence === "low" && !r.id.includes("insufficient")) score -= 10;
  return score;
}

export function prioritizeAdaptiveRecommendations(
  candidates: AdaptiveRecommendation[]
): {
  primary: AdaptiveRecommendation | null;
  secondary: AdaptiveRecommendation[];
} {
  const byId = new Map<string, AdaptiveRecommendation>();
  for (const c of candidates) {
    const prev = byId.get(c.id);
    if (!prev || scoreRecommendation(c) > scoreRecommendation(prev)) {
      byId.set(c.id, c);
    }
  }

  const ranked = [...byId.values()].sort(
    (a, b) => scoreRecommendation(b) - scoreRecommendation(a)
  );

  if (ranked.length === 0) {
    return { primary: null, secondary: [] };
  }

  const primary = { ...ranked[0]!, priority: "primary" as const };
  const secondary = ranked
    .slice(1, 3)
    .map((r) => ({ ...r, priority: "secondary" as const }));

  return { primary, secondary };
}

export function buildOnTrackRecommendation(): AdaptiveRecommendation {
  return {
    id: "adapt-all-on-track",
    type: "goal",
    priority: "primary",
    title: "Im Plan",
    explanation: "Du bist aktuell im Plan.",
    evidence: ["Training, Ernährung und Gewicht zeigen keine relevanten Abweichungen."],
    action: { label: "Coach öffnen", href: "/coach" },
    confidence: "high",
    requiresConfirmation: false,
  };
}
