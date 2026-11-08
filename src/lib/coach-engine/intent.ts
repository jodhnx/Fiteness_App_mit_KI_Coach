import { prepareCoachText } from "@/lib/coach-engine/normalize";

/** Keep in sync with CoachContextMode in coach-actions (avoid circular import). */
export type CoachEngineMode =
  | "nutrition"
  | "training"
  | "weekly"
  | "weight"
  | "plan"
  | "general";

export type CoachTopic =
  | "protein"
  | "calories"
  | "macros"
  | "meal_plan"
  | "deficit_plateau"
  | "hypertrophy"
  | "strength"
  | "volume"
  | "split"
  | "deload"
  | "cardio"
  | "recovery"
  | "sleep"
  | "weight_trend"
  | "supplements"
  | "today_decision"
  | "progress"
  | "general";

export type CoachIntentKind =
  | "how_much"
  | "should_i"
  | "why"
  | "how_to"
  | "what_to_eat"
  | "compare"
  | "follow_up"
  | "status"
  | "other";

export type CoachIntent = {
  mode: CoachEngineMode;
  topics: CoachTopic[];
  kind: CoachIntentKind;
  isFollowUp: boolean;
  scores: Partial<Record<CoachTopic, number>>;
  normalized: string;
};

type TopicRule = {
  topic: CoachTopic;
  mode: CoachEngineMode;
  patterns: RegExp[];
  weight?: number;
};

const TOPIC_RULES: TopicRule[] = [
  {
    topic: "protein",
    mode: "nutrition",
    patterns: [
      /\bprotein\b/,
      /\beiweiss\b/,
      /\bgramm protein\b/,
      /\bwie viel protein\b/,
    ],
  },
  {
    topic: "calories",
    mode: "nutrition",
    patterns: [
      /\bkalorien\b/,
      /\btdee\b/,
      /\bbmr\b/,
      /\bmifflin\b/,
      /\bdefizit\b/,
      /\bueberschuss\b/,
      /\bmaintenance\b/,
      /\berhalt\b/,
    ],
  },
  {
    topic: "macros",
    mode: "nutrition",
    patterns: [
      /\bmakro/,
      /\bkohlenhydrate\b/,
      /\bfett\b/,
      /\bballaststoff/,
    ],
  },
  {
    topic: "meal_plan",
    mode: "nutrition",
    patterns: [
      /\bwas (soll|kann) ich (heute )?essen\b/,
      /\bmahlzeit/,
      /\bmeal prep\b/,
      /\bpre[- ]?workout\b/,
      /\bpost[- ]?workout\b/,
      /\bnoch \d+ kcal\b/,
      /\bfehlen noch\b/,
    ],
    weight: 1.2,
  },
  {
    topic: "deficit_plateau",
    mode: "weight",
    patterns: [
      /\btrotz defizit\b/,
      /\bnehme nicht ab\b/,
      /\bweight stall\b/,
      /\bplateau\b/,
      /\bstagnier/,
      /\bcheat meal\b/,
      /\bwassergewicht\b/,
      /\bglykogen\b/,
    ],
    weight: 1.3,
  },
  {
    topic: "hypertrophy",
    mode: "training",
    patterns: [
      /\bmuskelaufbau\b/,
      /\bhypertrophie\b/,
      /\baufbau\b/,
      /\bmasse\b/,
    ],
  },
  {
    topic: "strength",
    mode: "training",
    patterns: [/\bkraft\b/, /\bstärke\b/, /\b1rm\b/, /\bpr\b/, /\brekord\b/],
  },
  {
    topic: "volume",
    mode: "training",
    patterns: [
      /\bvolumen\b/,
      /\bsaetze\b/,
      /\bwiederholungen\b/,
      /\brir\b/,
      /\brpe\b/,
      /\bpause(n)?zeit/,
      /\bprogressive overload\b/,
      /\bfrequenz\b/,
    ],
  },
  {
    topic: "split",
    mode: "plan",
    patterns: [
      /\bupper.?lower\b/,
      /\bpush.?pull.?legs\b/,
      /\bfull.?body\b/,
      /\bsplit\b/,
      /\btrainingsplan\b/,
      /\bwochenplan\b/,
    ],
    weight: 1.2,
  },
  {
    topic: "deload",
    mode: "training",
    patterns: [/\bdeload\b/, /\bueberlast/, /\bübertrain/],
  },
  {
    topic: "cardio",
    mode: "training",
    patterns: [/\bcardio\b/, /\bausdauer\b/, /\blaufen\b/, /\bzone 2\b/],
  },
  {
    topic: "recovery",
    mode: "training",
    patterns: [
      /\bregeneration\b/,
      /\bmuskelkater\b/,
      /\brest day\b/,
      /\bruhetag\b/,
      /\berholung\b/,
    ],
  },
  {
    topic: "sleep",
    mode: "training",
    patterns: [
      /\bschlaf\b/,
      /\bschlecht geschlafen\b/,
      /\bmuede\b/,
      /\bmüde\b/,
    ],
  },
  {
    topic: "weight_trend",
    mode: "weight",
    patterns: [
      /\bgewicht\b/,
      /\bwaage\b/,
      /\bkoerperfett\b/,
      /\bkoerpermasse\b/,
      /\babnehmen\b/,
      /\bzunehmen\b/,
    ],
  },
  {
    topic: "supplements",
    mode: "general",
    patterns: [
      /\bcreatin\b/,
      /\bomega[- ]?3\b/,
      /\bvitamin d\b/,
      /\bmagnesium\b/,
      /\bkoffein\b/,
      /\belektrolyt/,
      /\bsupplement/,
      /\bproteinpulver\b/,
    ],
  },
  {
    topic: "today_decision",
    mode: "training",
    patterns: [
      /\bsoll ich (heute )?(trainieren|essen|weniger)\b/,
      /\bheute train/,
      /\btrotz.*schlaf/,
    ],
    weight: 1.4,
  },
  {
    topic: "progress",
    mode: "weekly",
    patterns: [
      /\bfortschritt\b/,
      /\bwoche\b/,
      /\bwochenbericht\b/,
      /\bwird es besser\b/,
    ],
  },
];

const FOLLOW_UP =
  /^(und|aber|ok|okay|dann|was ist mit|wie sieht es aus|bei|im|wenn ich|falls)\b|^und\b/;

function detectKind(t: string, isFollowUp: boolean): CoachIntentKind {
  if (isFollowUp) return "follow_up";
  if (/soll ich|sollte ich|macht es sinn|lohnt/.test(t)) return "should_i";
  if (/warum|wieso|weshalb/.test(t)) return "why";
  if (/wie viel|wieviele|wie hoch|berechne/.test(t)) return "how_much";
  if (/was (soll|kann) ich essen|was essen|meal/.test(t)) return "what_to_eat";
  if (/wie (kann|mache|plane|verbessere|optimiere)/.test(t)) return "how_to";
  if (/oder|besser als|vs\b|vergleich/.test(t)) return "compare";
  if (/status|überblick|ueberblick|wie stehe|zusammenfassung/.test(t))
    return "status";
  return "other";
}

function scoreTopics(t: string): Partial<Record<CoachTopic, number>> {
  const scores: Partial<Record<CoachTopic, number>> = {};
  for (const rule of TOPIC_RULES) {
    let hit = 0;
    for (const p of rule.patterns) {
      if (p.test(t)) hit += 1;
    }
    if (hit > 0) {
      scores[rule.topic] = hit * (rule.weight ?? 1);
    }
  }
  return scores;
}

function modeFromTopics(
  topics: CoachTopic[],
  scores: Partial<Record<CoachTopic, number>>
): CoachEngineMode {
  const modeScore: Record<CoachEngineMode, number> = {
    nutrition: 0,
    training: 0,
    weekly: 0,
    weight: 0,
    plan: 0,
    general: 0,
  };
  for (const topic of topics) {
    const rule = TOPIC_RULES.find((r) => r.topic === topic);
    if (!rule) continue;
    modeScore[rule.mode] += scores[topic] ?? 1;
  }
  let best: CoachEngineMode = "general";
  let bestScore = 0;
  for (const [mode, score] of Object.entries(modeScore) as [
    CoachEngineMode,
    number,
  ][]) {
    if (score > bestScore) {
      best = mode;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : "general";
}

/**
 * Infer follow-up topic from prior user/assistant turns when the new message
 * is short ("Und im Cut?").
 */
export function inferFollowUpTopics(
  history: { role: string; content: string }[]
): CoachTopic[] {
  const recent = history
    .slice(-4)
    .map((m) => prepareCoachText(m.content))
    .join(" ");
  const scores = scoreTopics(recent);
  return Object.entries(scores)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3)
    .map(([t]) => t as CoachTopic);
}

export function classifyCoachIntent(
  message: string,
  opts?: {
    hint?: CoachEngineMode | null;
    history?: { role: string; content: string }[];
  }
): CoachIntent {
  const normalized = prepareCoachText(message);
  const isFollowUp =
    FOLLOW_UP.test(normalized) ||
    (normalized.split(" ").length <= 8 &&
      /^(und|aber|wenn|falls|im|bei)\b/.test(normalized));

  const scores = scoreTopics(normalized);

  // Follow-ups like "Und im Cut?" inherit prior topics (e.g. protein).
  if (isFollowUp && opts?.history?.length) {
    for (const t of inferFollowUpTopics(opts.history)) {
      scores[t] = (scores[t] ?? 0) + 1.5;
    }
  }

  let topics = Object.entries(scores)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([t]) => t as CoachTopic);

  if (topics.length === 0) topics = ["general"];

  const mode =
    opts?.hint && opts.hint !== "general"
      ? opts.hint
      : modeFromTopics(topics, scores);

  return {
    mode,
    topics,
    kind: detectKind(normalized, isFollowUp),
    isFollowUp,
    scores,
    normalized,
  };
}
