import { format } from "date-fns";
import {
  collectDailyPlanCandidates,
  prioritizeDailyPlan,
} from "@/lib/intelligence/daily-plan/prioritize";
import type {
  DailyActionPlan,
  DailyActionPlanContext,
  DailyPlanConfidence,
  DailyPlanStatus,
} from "@/lib/intelligence/daily-plan/types";

function planStatus(ctx: DailyActionPlanContext, primaryId: string | undefined): DailyPlanStatus {
  if (primaryId === "plan-insufficient") return "insufficient_data";
  if (primaryId === "plan-on-track") return "on_track";
  if (
    ctx.daily?.allGood ||
    ctx.nutritionPerformance?.recommendationState === "no_action_needed"
  ) {
    return "on_track";
  }
  return "needs_attention";
}

function planConfidence(
  primary: DailyActionPlan["primary"],
  secondary: DailyActionPlan["secondary"]
): DailyPlanConfidence {
  const levels = [primary?.confidence, ...secondary.map((s) => s.confidence)].filter(Boolean);
  if (levels.includes("high")) return "high";
  if (levels.every((l) => l === "low")) return "low";
  return "medium";
}

export function buildDailyActionPlan(ctx: DailyActionPlanContext): DailyActionPlan {
  const candidates = collectDailyPlanCandidates(ctx);
  const { primary, secondary } = prioritizeDailyPlan(candidates);

  const status = planStatus(ctx, primary?.id);
  const evidence = [
    ...(primary?.evidence ?? []),
    ...secondary.flatMap((s) => s.evidence).slice(0, 2),
  ];

  const summary =
    primary?.explanation ??
    (status === "on_track"
      ? "Du bist heute im Plan."
      : "Heute gibt es konkrete nächste Schritte.");

  return {
    id: `daily-plan-${format(ctx.now, "yyyy-MM-dd")}`,
    date: format(ctx.now, "yyyy-MM-dd"),
    status,
    primary,
    secondary,
    summary,
    evidence,
    confidence: planConfidence(primary, secondary),
  };
}

export function formatDailyActionPlanForCoach(
  plan: DailyActionPlan,
  compact = false
): string[] {
  const lines = [`Status: ${plan.status}`, `Summary: ${plan.summary}`];
  if (plan.primary) {
    lines.push(
      `Primary: ${plan.primary.title} — ${plan.primary.explanation}${plan.primary.requiresConfirmation ? " [Nur vorschlagen — Nutzer bestätigt]" : ""}`
    );
  }
  if (!compact) {
    for (const s of plan.secondary) {
      lines.push(`Secondary: ${s.title} — ${s.explanation}`);
    }
    if (plan.evidence.length) {
      lines.push(`Evidence: ${plan.evidence.slice(0, 3).join(" | ")}`);
    }
  } else if (plan.secondary[0]) {
    lines.push(`Secondary: ${plan.secondary[0].title} — ${plan.secondary[0].explanation}`);
  }
  lines.push(`Confidence: ${plan.confidence}`);
  return lines;
}
