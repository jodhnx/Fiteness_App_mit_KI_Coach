import {
  classifyCoachIntent,
  type CoachIntent,
} from "@/lib/coach-engine/intent";
import { parseCoachUserFacts } from "@/lib/coach-engine/facts";
import { composeLocalCoachReply } from "@/lib/coach-engine/compose";
import {
  actionsForContextMode,
  type CoachAction,
  type CoachContextMode,
} from "@/lib/coach-actions";

export type LocalCoachResult = {
  message: string;
  mode: CoachContextMode;
  actions: CoachAction[];
  intent: CoachIntent;
  source: "local-engine";
};

/**
 * API-key-free coach reply: intent → user facts from context → knowledge + rules.
 * Does not call external AI. Does not invent user data.
 */
export function generateLocalCoachReply(input: {
  message: string;
  contextText: string;
  history?: { role: string; content: string }[];
  hint?: CoachContextMode | null;
  actions?: CoachAction[];
}): LocalCoachResult {
  const intent = classifyCoachIntent(input.message, {
    hint: input.hint,
    history: input.history,
  });
  const facts = parseCoachUserFacts(input.contextText);
  const message = composeLocalCoachReply(intent, facts).trim();
  const actions =
    input.actions?.length ? input.actions : actionsForContextMode(intent.mode);

  return {
    message:
      message ||
      "Ich konnte dazu keine sinnvolle lokale Antwort bauen. Formuliere die Frage etwas konkreter (z. B. Protein, Kalorien, Split, Schlaf).",
    mode: intent.mode,
    actions,
    intent,
    source: "local-engine",
  };
}

export { classifyCoachIntent } from "@/lib/coach-engine/intent";
export { parseCoachUserFacts } from "@/lib/coach-engine/facts";
