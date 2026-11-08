import type { CoachTopic } from "@/lib/coach-engine/intent";

/** Curated fitness knowledge — facts only, no medical claims. */
export const KNOWLEDGE: Record<
  CoachTopic,
  { title: string; bullets: string[]; caveats?: string[] }
> = {
  protein: {
    title: "Protein",
    bullets: [
      "Krafttrainierende: typisch 1,6–2,2 g Protein pro kg Körpergewicht.",
      "Im Kaloriendefizit oft eher Richtung 1,8–2,4 g/kg, um Muskelverlust zu begrenzen.",
      "Verteile Protein über 3–5 Mahlzeiten; ~0,3–0,5 g/kg pro Mahlzeit ist praxisnah.",
      "Proteinpulver ist optional — praktische Ergänzung, kein Muss.",
    ],
  },
  calories: {
    title: "Kalorien & Energiebilanz",
    bullets: [
      "Gewicht verändert sich langfristig über die Energiebilanz (Aufnahme vs. Verbrauch).",
      "TDEE ≈ BMR × Aktivitätsfaktor; Mifflin-St Jeor ist eine gängige BMR-Schätzung.",
      "Fettverlust: moderates Defizit (~250–500 kcal/Tag), nicht extrem.",
      "Muskelaufbau: leichter Überschuss (~150–300 kcal) plus ausreichend Protein und Training.",
      "Waagen-Schwankungen von 0,5–2 kg durch Glykogen, Wasser und Darminhalt sind normal.",
    ],
  },
  macros: {
    title: "Makronährstoffe",
    bullets: [
      "Protein zuerst setzen, dann Fett (~0,6–1,0 g/kg), Rest Kohlenhydrate.",
      "Kohlenhydrate unterstützen Trainingsleistung; stark kürzen nur mit gutem Grund.",
      "Ballaststoffe (Gemüse, Vollkorn, Hülsenfrüchte) helfen Sättigung und Verdauung.",
    ],
  },
  meal_plan: {
    title: "Mahlzeitenplanung",
    bullets: [
      "Orientiere dich an offenen Kalorien und Protein — fülle Lücken gezielt.",
      "Pre-Workout: leicht verdaulich, etwas Protein + Kohlenhydrate 1–3 h vorher.",
      "Post-Workout: Protein + Kohlenhydrate helfen Recovery, Timing ist flexibel.",
      "Meal Prep reduziert spontane Fehlentscheidungen.",
    ],
  },
  deficit_plateau: {
    title: "Plateau trotz Defizit",
    bullets: [
      "Kurzfristige Waagen-Stagnation ≠ Fettverlust gestoppt (Wasser/Glykogen).",
      "Häufige Ursachen: Unterschätzte Kalorien, weniger NEAT, zu aggressives Defizit, Schlafmangel.",
      "Prüfe 7–14-Tage-Durchschnitt statt Einzelmessungen.",
      "Nach längerem Cut: kurze Maintenance oder Refeed kann helfen — kein Crash-Dieting.",
    ],
  },
  hypertrophy: {
    title: "Muskelaufbau (Hypertrophie)",
    bullets: [
      "Progressive Overload: langfristig mehr Leistung (Gewicht, Reps, Sätze, Kontrolle).",
      "Effektiver Wiederholungsbereich oft 5–12+ bei 0–3 RIR.",
      "10–20+ harte Sätze pro Muskelgruppe/Woche sind ein typischer Startkorridor.",
      "Schlaf und Protein sind genauso wichtig wie die Trainingswahl.",
    ],
  },
  strength: {
    title: "Kraftsteigerung",
    bullets: [
      "Schwere Grundübungen mit niedrigeren Wiederholungen (1–5) plus ergänzende Hypertrophiearbeit.",
      "Technik vor Ego-Gewicht; Pausenzeiten 2–5 Min bei schweren Sätzen.",
      "Kraftplateaus: Volumen/Intensität periodisieren, Schlaf und Körpergewicht prüfen.",
    ],
  },
  volume: {
    title: "Volumen, Intensität, RIR/RPE",
    bullets: [
      "RIR 0–3 = nah am Muskelversagen; Anfänger oft eher 2–4 RIR.",
      "Mehr Volumen hilft nur, wenn Recovery mitkommt — Qualität > endlose Sätze.",
      "Pausen: Isolation ~60–90 s, schwere Mehrgelenksübungen 2–3+ Min.",
    ],
  },
  split: {
    title: "Trainingspläne & Splits",
    bullets: [
      "Full Body: gut für 2–3 Tage/Woche.",
      "Upper/Lower: stark bei 4 Tagen.",
      "Push/Pull/Legs: flexibel bei 3–6 Tagen.",
      "Wähle den Split nach verfügbaren Tagen, nicht nach Instagram.",
      "Jede Muskelgruppe idealerweise ≥2×/Woche.",
    ],
  },
  deload: {
    title: "Deload & Überlastung",
    bullets: [
      "Deload: Volumen/Intensität 20–50 % reduzieren für 5–7 Tage.",
      "Hinweise: Leistungsabfall, schlechter Schlaf, anhaltende Gelenkschmerzen, Motivationstief.",
      "Kein Versagen — geplante Erholung ist Teil von Fortschritt.",
    ],
  },
  cardio: {
    title: "Cardio",
    bullets: [
      "Zone-2-Cardio unterstützt Gesundheit und Recovery ohne starkes Interferenzrisiko.",
      "Bei Muskelaufbau: Cardio dosieren, Krafttraining priorisieren.",
      "Schritte/NEAT zählen oft stärker als ein einzelnes HIIT-Workout.",
    ],
  },
  recovery: {
    title: "Regeneration",
    bullets: [
      "Muskelgruppen brauchen oft 48–72 h zwischen harten Einheiten.",
      "Muskelkater allein ist kein Fortschrittsmaß.",
      "Ruhetag ≠ Faulheit: Schlaf, Ernährung und leichte Bewegung fördern Adaptation.",
    ],
  },
  sleep: {
    title: "Schlaf",
    bullets: [
      "Ziel: regelmäßig ~7–9 h; schlechter Schlaf senkt Leistung und Appetitkontrolle.",
      "Nach schlechter Nacht: Training verkürzen/intensität senken oder Technikarbeit — kein Ego-PR.",
      "Koffein und Screens abends können Schlafqualität verschlechtern.",
    ],
  },
  weight_trend: {
    title: "Gewicht & Fortschritt",
    bullets: [
      "Nutze 7-Tage-Mittelwerte und Fotos/Maße neben der Waage.",
      "Cheat Meals erhöhen oft Glykogen + Wasser — Anstieg am nächsten Tag ist meist kein Fettzuwachs.",
      "Plateaus 1–2 Wochen sind normal; erst danach Kalorien/NEAT/Training prüfen.",
    ],
  },
  supplements: {
    title: "Supplements (Grundlagen)",
    bullets: [
      "Creatin Monohydrat (~3–5 g/Tag) ist gut untersucht für Kraft/Leistung — kein Wundermittel.",
      "Proteinpulver: Convenience.",
      "Vitamin D, Omega-3, Magnesium: sinnvoll bei Mangel/geringer Aufnahme — keine Diagnose.",
      "Koffein kann Leistung kurzfristig steigern; Timing und Verträglichkeit beachten.",
      "Keine übertriebenen Versprechen; bei Erkrankungen ärztlichen Rat einholen.",
    ],
    caveats: [
      "Keine medizinischen Diagnosen oder Heilversprechen.",
    ],
  },
  today_decision: {
    title: "Tagesentscheidungen",
    bullets: [
      "Schlechter Schlaf + schwere Beine → Volumen/Intensität reduzieren oder Ruhetag.",
      "Gestern über Kalorien → heute nicht „bestrafen“, sondern zum Ziel zurückkehren.",
      "Kein Training geplant → Kalorien etwas näher an Maintenance halten, Protein hoch lassen.",
    ],
  },
  progress: {
    title: "Fortschrittsanalyse",
    bullets: [
      "Bewerte Training (Frequenz, Progression), Ernährung (Protein/Kalorien-Treffer) und Recovery zusammen.",
      "Eine schwache Woche ist kein Systembruch — Muster über 2–4 Wochen zählen.",
    ],
  },
  general: {
    title: "Allgemeine Fitness",
    bullets: [
      "Konsistenz schlägt Perfektion: Training + Protein + Schlaf als Basis.",
      "Ändere eine Variable nach der anderen (Kalorien, Volumen, Schlaf).",
      "Daten aus der App nutzen, fehlende Werte klar nachfragen.",
    ],
  },
};

export function knowledgeForTopics(topics: CoachTopic[]) {
  const uniq = [...new Set(topics.length ? topics : (["general"] as CoachTopic[]))];
  return uniq.map((t) => KNOWLEDGE[t] ?? KNOWLEDGE.general);
}
