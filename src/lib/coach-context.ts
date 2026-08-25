/**
 * Coach user context — selective engine (AI Coach 2.0).
 * Prefer buildSelectiveCoachContext for new call sites.
 */
export {
  buildCoachUserContext,
  buildSelectiveCoachContext,
  type CoachContextBuildResult,
} from "@/lib/coach-context-engine";
