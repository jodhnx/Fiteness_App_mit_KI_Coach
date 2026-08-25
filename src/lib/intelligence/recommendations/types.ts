import type { IntelligenceAction } from "@/lib/intelligence/types";

export type AdaptiveRecommendationType =
  | "nutrition"
  | "training"
  | "weight"
  | "recovery"
  | "progress"
  | "consistency"
  | "goal"
  | "planning";

export type AdaptiveConfidence = "high" | "medium" | "low";

export type AdaptiveRecommendation = {
  id: string;
  type: AdaptiveRecommendationType;
  priority: "primary" | "secondary";
  title: string;
  explanation: string;
  evidence: string[];
  action?: IntelligenceAction;
  confidence: AdaptiveConfidence;
  requiresConfirmation: boolean;
};

export type AdaptiveRecommendations = {
  generatedAt: string;
  primary: AdaptiveRecommendation | null;
  secondary: AdaptiveRecommendation[];
  allOnTrack: boolean;
  coachContext: {
    summary: string;
    items: {
      explanation: string;
      evidence: string[];
      confidence: AdaptiveConfidence;
      requiresConfirmation: boolean;
    }[];
  };
};
