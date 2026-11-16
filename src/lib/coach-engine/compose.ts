import type { CoachIntent } from "@/lib/coach-engine/intent";
import {
  estimateProteinTarget,
  type CoachUserFacts,
} from "@/lib/coach-engine/facts";
import { knowledgeForTopics } from "@/lib/coach-engine/knowledge";

function section(title: string, body: string[]): string {
  if (!body.length) return "";
  return `**${title}**\n${body.map((b) => (b.startsWith("-") ? b : `- ${b}`)).join("\n")}`;
}

function personalNutritionBlock(facts: CoachUserFacts): string[] {
  const lines: string[] = [];
  if (facts.calorieTarget != null) {
    lines.push(
      `Dein Kalorienziel liegt bei **${facts.calorieTarget} kcal**` +
        (facts.caloriesConsumed != null
          ? ` — heute bisher ca. **${Math.round(facts.caloriesConsumed)} kcal**`
          : "") +
        (facts.caloriesRemaining != null
          ? ` (noch ca. **${Math.round(facts.caloriesRemaining)} kcal** offen)`
          : "") +
        "."
    );
  }
  if (facts.proteinTarget != null || facts.proteinRemaining != null) {
    const parts: string[] = [];
    if (facts.proteinTarget != null) parts.push(`Ziel **${facts.proteinTarget} g**`);
    if (facts.proteinConsumed != null)
      parts.push(`bisher **${Math.round(facts.proteinConsumed)} g**`);
    if (facts.proteinRemaining != null)
      parts.push(`noch **${Math.round(facts.proteinRemaining)} g**`);
    lines.push(`Protein: ${parts.join(", ")}.`);
  }
  if (facts.weightKg != null) {
    lines.push(`Aktuelles Gewicht laut Profil: **${facts.weightKg} kg**.`);
  }
  if (facts.nutritionGoal) {
    lines.push(`Ernährungsziel: **${facts.nutritionGoal}**.`);
  }
  return lines;
}

function proteinAnswer(facts: CoachUserFacts, intent: CoachIntent): string {
  const goal = facts.nutritionGoal ?? facts.trainingGoal;
  const estimate = estimateProteinTarget(facts.weightKg, goal);
  const parts: string[] = [];

  parts.push(
    intent.isFollowUp
      ? "Bezogen auf deine Proteinfrage — hier die Anpassung an den Kontext:"
      : "Hier eine konkrete Protein-Empfehlung auf Basis deiner verfügbaren Daten:"
  );

  const personal = personalNutritionBlock(facts);
  if (personal.length) {
    parts.push(section("Deine Daten", personal));
  } else {
    parts.push(
      "_In deinem Profil fehlen Gewicht oder Ziele — die folgende Empfehlung ist deshalb allgemein._"
    );
  }

  if (estimate) {
    parts.push(
      section("Empfehlung", [
        `Sinnvoller Bereich: **${estimate.low}–${estimate.high} g/Tag** (Richtwert um **${estimate.mid} g**).`,
        estimate.note,
        facts.proteinTarget != null
          ? `Dein App-Ziel liegt bei **${facts.proteinTarget} g** — das ${
              facts.proteinTarget >= estimate.low &&
              facts.proteinTarget <= estimate.high
                ? "passt gut in diesen Korridor"
                : "kannst du ggf. an den Korridor anpassen"
            }.`
          : "Trag Gewicht und Ziel in den Einstellungen ein, dann kann ich noch präziser werden.",
      ])
    );
  } else {
    parts.push(
      section("Allgemeine Empfehlung", [
        "Ohne Körpergewicht: orientiere dich an **1,6–2,2 g Protein/kg**.",
        "Wie viel wiegst du aktuell? Dann rechne ich dir den Bereich aus.",
      ])
    );
  }

  const know = knowledgeForTopics(["protein"]);
  parts.push(
    section(know[0]!.title, know[0]!.bullets.slice(0, 3))
  );

  parts.push(
    section("Nächste Schritte", [
      "Protein auf 3–5 Mahlzeiten verteilen.",
      facts.proteinRemaining != null && facts.proteinRemaining > 0
        ? `Heute noch ca. **${Math.round(facts.proteinRemaining)} g** Protein offen — z. B. Magerquark, Fleisch, Fisch, Eier oder Shake.`
        : "Offenes Protein in der Ernährung prüfen und bei Bedarf nachlegen.",
    ])
  );

  return parts.filter(Boolean).join("\n\n");
}

function mealPlanAnswer(facts: CoachUserFacts): string {
  const parts: string[] = [
    "So kannst du den Rest des Tages sinnvoll füllen — nur mit den Daten, die vorliegen:",
  ];
  const personal = personalNutritionBlock(facts);
  if (personal.length) parts.push(section("Aktueller Stand", personal));
  else
    parts.push(
      "_Kalorien/Protein für heute sind nicht vollständig verfügbar — allgemeine Orientierung:_"
    );

  const remainingKcal = facts.caloriesRemaining;
  const remainingP = facts.proteinRemaining;
  const ideas: string[] = [];
  if (remainingKcal != null && remainingKcal > 0) {
    ideas.push(
      `Noch ca. **${Math.round(remainingKcal)} kcal** — plane 1–2 Mahlzeiten/Snacks in diesem Budget.`
    );
  }
  if (remainingP != null && remainingP > 20) {
    ideas.push(
      `Priorisiere zuerst die fehlenden **~${Math.round(remainingP)} g Protein** (z. B. Skyr, Hähnchen, Thunfisch, Linsen + Shake).`
    );
  } else if (remainingP != null && remainingP <= 20) {
    ideas.push("Protein ist weitgehend erreicht — Restkalorien mit Gemüse/Kohlenhydraten füllen.");
  }
  ideas.push(
    "Beispiel-Kombi: proteinreiche Basis + Gemüse + eine Kohlenhydratquelle (Reis, Kartoffel, Vollkorn)."
  );
  parts.push(section("Konkret", ideas));
  parts.push(
    section("Tipp", [
      "In der App unter Ernährung kannst du gezielt eine Mahlzeit hinzufügen.",
    ])
  );
  return parts.join("\n\n");
}

function plateauAnswer(facts: CoachUserFacts, intent: CoachIntent): string {
  const wantsGain =
    /nicht (mehr )?zu|zunehmen|aufbau|masse|bulk/.test(intent.normalized);
  const parts: string[] = [
    wantsGain
      ? "Wenn das Gewicht trotz Aufbauziel stagniert, prüfen wir die typischen Hebel — mit deinen verfügbaren Daten:"
      : "Wenn das Gewicht trotz Defizit stagniert, sind oft Wasser/Glykogen oder Tracking die Ursache — Analyse:",
  ];
  const signals: string[] = [];
  if (facts.calorieTarget != null)
    signals.push(`Kalorienziel: **${facts.calorieTarget} kcal**`);
  if (facts.caloriesConsumed != null)
    signals.push(`Heute erfasst: **${Math.round(facts.caloriesConsumed)} kcal**`);
  if (facts.proteinTarget != null || facts.proteinConsumed != null) {
    signals.push(
      `Protein: ${facts.proteinConsumed != null ? `**${Math.round(facts.proteinConsumed)} g**` : "—"} / Ziel **${facts.proteinTarget ?? "?"} g**`
    );
  }
  if (facts.weightKg != null) signals.push(`Aktuelles Gewicht: **${facts.weightKg} kg**`);
  if (facts.weightTrend) signals.push(`Trend: **${facts.weightTrend}**`);
  if (facts.nutritionGoal) signals.push(`Ernährungsziel: **${facts.nutritionGoal}**`);
  if (facts.trainingToday) signals.push(`Training: ${facts.trainingToday}`);
  if (signals.length) parts.push(section("Deine Daten", signals));
  else
    parts.push(
      "_Gewichtstrend/Kalorien sind unvollständig — allgemeine Einordnung:_"
    );

  const advice: string[] = wantsGain
    ? [
        "7–14-Tage-Mittelgewicht prüfen, nicht den Tageswert.",
        "Wenn Aufnahme ≤ Ziel: +150–250 kcal (meist KH), Protein halten.",
        "Trainingsvolumen/Progression und Schlaf checken — ohne Reiz kein Aufbau.",
        "Schritte/Cardio nicht unnötig hochfahren im Aufbau.",
      ]
    : [
        "7–14-Tage-Mittel nutzen; Cheat Meals erzeugen oft Wassergewicht.",
        "Tracking-Lücken (Öle, Saucen, Wochenende) schließen.",
        "Falls Defizit schon lange hart: kurze Maintenance/Refeed, dann weiter.",
        "NEAT/Schritte und Schlaf mitprüfen — kein extremes Unteressen.",
      ];
  parts.push(section("Empfehlung", advice));
  parts.push(
    section("Nächste Schritte", [
      "Gewicht & Mahlzeiten weiter loggen.",
      "Sag mir dein 14-Tage-Mittel und ob Cut oder Aufbau — dann wird die Anpassung konkreter.",
    ])
  );
  parts.push(
    "_Lokale Analyse auf Basis vorhandener App-Daten. Keine medizinische Diagnose._"
  );
  return parts.join("\n\n");
}

function planAnalysisAnswer(facts: CoachUserFacts): string {
  const parts: string[] = [
    "Kurze Bewertung deines Trainings-/Zielkontexts mit den verfügbaren App-Daten:",
  ];
  const signals: string[] = [];
  if (facts.trainingGoal) signals.push(`Trainingsziel: **${facts.trainingGoal}**`);
  if (facts.nutritionGoal) signals.push(`Ernährung: **${facts.nutritionGoal}**`);
  if (facts.workoutDays != null)
    signals.push(`Trainingstage/Woche: **${facts.workoutDays}**`);
  if (facts.experience) signals.push(`Erfahrung: **${facts.experience}**`);
  if (facts.trainingToday) signals.push(`Heute: ${facts.trainingToday}`);
  if (facts.weightKg != null) signals.push(`Gewicht: **${facts.weightKg} kg**`);
  if (signals.length) parts.push(section("Dein Stand", signals));
  else
    parts.push(
      "_Trainingsplan-Details fehlen im Kontext — allgemeine Split-Orientierung:_"
    );

  const days = facts.workoutDays;
  const splitHint =
    days == null
      ? "Wähle den Split nach verfügbaren Tagen (2–3 Full Body, 4 Upper/Lower, 5–6 PPL)."
      : days <= 3
        ? "Bei 2–3 Tagen: Full Body oder Upper/Lower light — jede Muskelgruppe ≥2×/Woche anstreben."
        : days === 4
          ? "Bei 4 Tagen: Upper/Lower ist oft der beste Kompromiss aus Volumen und Recovery."
          : "Bei 5–6 Tagen: PPL oder ähnliche Splits — auf Deload und Schlaf achten.";

  parts.push(
    section("Volumen & Frequenz", [
      splitHint,
      "10–20+ harte Sätze/Muskelgruppe/Woche als Startkorridor; Progression vor Satzflut.",
      "RIR 1–3 bei Arbeitssätzen; schwere Mehrgelenker mit längeren Pausen.",
    ])
  );
  parts.push(
    section("Nächste Schritte", [
      "Prüfe, ob Kalorien/Protein zum Ziel passen (Cut vs. Aufbau).",
      "Eine Variable ändern: Volumen, Intensität oder Kalorien — nicht alles gleichzeitig.",
      "Sag mir deinen aktuellen Split und die Übungen, dann bewerte ich Frequenz konkreter.",
    ])
  );
  parts.push(
    "_Lokale Plananalyse. Keine medizinische Beratung._"
  );
  return parts.join("\n\n");
}

function progressSummaryAnswer(facts: CoachUserFacts): string {
  const parts: string[] = [
    "Fortschritts-Check auf Basis der vorliegenden Daten:",
  ];
  const signals: string[] = [];
  if (facts.weightKg != null) signals.push(`Gewicht: **${facts.weightKg} kg**`);
  if (facts.weightTrend) signals.push(`Trend: **${facts.weightTrend}**`);
  if (facts.calorieTarget != null)
    signals.push(`Kalorienziel: **${facts.calorieTarget} kcal**`);
  if (facts.caloriesConsumed != null)
    signals.push(`Heute: **${Math.round(facts.caloriesConsumed)} kcal**`);
  if (facts.proteinTarget != null)
    signals.push(`Proteinziel: **${facts.proteinTarget} g**`);
  if (facts.nutritionGoal) signals.push(`Ziel: **${facts.nutritionGoal}**`);
  if (facts.trainingToday) signals.push(`Training: ${facts.trainingToday}`);
  if (signals.length) parts.push(section("Signale", signals));
  else parts.push("_Wenige Fortschrittsdaten im Kontext — bitte Gewicht & Mahlzeiten loggen._");

  parts.push(
    section("Einordnung", [
      "Muster über 2–4 Wochen zählen stärker als ein einzelner Tag.",
      "Training (Frequenz/Progression), Ernährung (Protein/Kalorien) und Recovery zusammen bewerten.",
      facts.weightTrend
        ? `Dein aktueller Gewichtstrend (**${facts.weightTrend}**) sollte zum Ernährungsziel passen.`
        : "Trag regelmäßig Gewicht ein, damit der Trend aussagekräftig wird.",
    ])
  );
  parts.push(
    section("Nächste Schritte", [
      "7-Tage-Mittel im Fortschritt ansehen.",
      "Bei Plateau: Kalorien-Trefferquote und Trainingsvolumen prüfen.",
    ])
  );
  return parts.join("\n\n");
}

function todayDecisionAnswer(facts: CoachUserFacts, intent: CoachIntent): string {
  const parts: string[] = [
    "Kurze Entscheidungshilfe — basierend auf verfügbaren Signalen, ohne zu raten:",
  ];
  const signals: string[] = [];
  if (facts.sleepHours != null) {
    signals.push(
      `Schlaf: **${facts.sleepHours} h**` +
        (facts.sleepHours < 6
          ? " (eher kurz — Intensität besser drosseln)"
          : "")
    );
  }
  if (facts.trainingToday) signals.push(`Training heute: ${facts.trainingToday}`);
  if (facts.primaryPriority) signals.push(`Priorität: ${facts.primaryPriority}`);
  if (facts.caloriesRemaining != null && /essen|kalorien|weniger/.test(intent.normalized)) {
    signals.push(
      `Noch ca. **${Math.round(facts.caloriesRemaining)} kcal** offen — nicht „bestrafen“, zum Ziel zurückkehren.`
    );
  }
  if (signals.length) parts.push(section("Signale", signals));
  else
    parts.push(
      "_Schlaf-/Trainingsdaten fehlen teilweise — Empfehlung daher konservativ._"
    );

  const advice: string[] = [];
  if (facts.sleepHours != null && facts.sleepHours < 6) {
    advice.push(
      "Bei wenig Schlaf: Volumen −20–40 %, schwere PRs verschieben oder Technik/Mobility."
    );
  } else {
    advice.push(
      "Wenn du dich okay fühlst: geplantes Training wie vorgesehen, auf RIR 1–3 achten."
    );
  }
  if (/weniger essen|gestern/.test(intent.normalized)) {
    advice.push(
      "Über dem Ziel gestern → heute normal am Ziel bleiben, kein extremes Unteressen."
    );
  }
  if (/nicht trainier|ruhe/.test(intent.normalized)) {
    advice.push(
      "Ohne Training: Protein hoch halten, Kalorien eher Richtung Maintenance wenn das Ziel Abnehmen nicht akut ist."
    );
  }
  parts.push(section("Empfehlung", advice));
  return parts.join("\n\n");
}

function genericTopicAnswer(
  intent: CoachIntent,
  facts: CoachUserFacts
): string {
  const packs = knowledgeForTopics(intent.topics.slice(0, 3));
  const parts: string[] = [];

  parts.push(
    intent.kind === "why"
      ? "Hier die wichtigsten Zusammenhänge zu deiner Frage:"
      : intent.kind === "how_to"
        ? "So gehst du das praktisch an:"
        : "Hier eine fundierte Einordnung zu deiner Frage:"
  );

  const personal = personalNutritionBlock(facts);
  if (
    personal.length &&
    (intent.mode === "nutrition" ||
      intent.mode === "weight" ||
      intent.topics.includes("calories") ||
      intent.topics.includes("protein"))
  ) {
    parts.push(section("Bezug zu deinen Daten", personal));
  }

  if (facts.weightTrend && intent.topics.includes("weight_trend")) {
    parts.push(section("Gewichtstrend", [`Trend laut App: **${facts.weightTrend}**.`]));
  }
  if (facts.trainingToday && intent.mode === "training") {
    parts.push(section("Training", [`Heute: ${facts.trainingToday}`]));
  }

  for (const pack of packs) {
    parts.push(section(pack.title, pack.bullets.slice(0, 4)));
    if (pack.caveats?.length) {
      parts.push(section("Hinweis", pack.caveats));
    }
  }

  const next: string[] = [];
  if (intent.mode === "nutrition") {
    next.push("Offene Makros in der Ernährungsansicht prüfen und eine konkrete Mahlzeit loggen.");
  } else if (intent.mode === "training" || intent.mode === "plan") {
    next.push("Trainingsplan oder nächstes Workout in der App öffnen und eine Variable anpassen.");
  } else if (intent.mode === "weight") {
    next.push("7-Tage-Gewichtstrend im Fortschritt ansehen, nicht nur den Tageswert.");
  } else {
    next.push("Sag mir Gewicht, Ziel und Trainingstage, wenn du eine noch präzisere Empfehlung willst.");
  }
  parts.push(section("Nächste Schritte", next));

  parts.push(
    "_Antwort aus der lokalen NEXFORM-Coach-Engine (regel- & wissensbasiert). Keine medizinische Beratung._"
  );

  return parts.filter(Boolean).join("\n\n");
}

export function composeLocalCoachReply(
  intent: CoachIntent,
  facts: CoachUserFacts
): string {
  if (intent.topics.includes("protein") && intent.kind === "how_much") {
    return proteinAnswer(facts, intent);
  }
  if (
    intent.topics.includes("protein") &&
    intent.isFollowUp &&
    /cut|defizit|abnehm|aufbau|bulk/.test(intent.normalized)
  ) {
    return proteinAnswer(facts, intent);
  }
  if (
    intent.topics.includes("deficit_plateau") ||
    (intent.kind === "why" &&
      (intent.topics.includes("weight_trend") ||
        intent.topics.includes("calories")))
  ) {
    return plateauAnswer(facts, intent);
  }
  if (
    intent.topics.includes("meal_plan") ||
    intent.kind === "what_to_eat"
  ) {
    return mealPlanAnswer(facts);
  }
  if (
    intent.topics.includes("today_decision") ||
    (intent.kind === "should_i" &&
      (intent.topics.includes("sleep") ||
        intent.topics.includes("calories") ||
        intent.topics.includes("recovery")))
  ) {
    return todayDecisionAnswer(facts, intent);
  }
  if (
    intent.topics.includes("split") ||
    (intent.mode === "plan" && intent.kind === "how_to")
  ) {
    return planAnalysisAnswer(facts);
  }
  if (intent.topics.includes("progress")) {
    return progressSummaryAnswer(facts);
  }
  return genericTopicAnswer(intent, facts);
}
