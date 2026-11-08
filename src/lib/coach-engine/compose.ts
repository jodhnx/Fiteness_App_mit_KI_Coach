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
  return genericTopicAnswer(intent, facts);
}
