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
      "Grundumsatz (BMR) ≈ Mifflin-St Jeor; Gesamtumsatz (TDEE) ≈ BMR × Aktivitätsfaktor (+ NEAT).",
      "Fettverlust: moderates Defizit (~250–500 kcal/Tag). Aufbau: leichter Überschuss (~150–300).",
      "Thermischer Effekt der Nahrung (TEF) und Schritte beeinflussen den Verbrauch spürbar.",
      "Waagen-Schwankungen von 0,5–2 kg durch Glykogen, Wasser und Darminhalt sind normal.",
      "Refeed/Diätpause: kurz Kalorien anheben kann Hormone/Leistung stützen — kein Freifahrtschein.",
    ],
  },
  macros: {
    title: "Makronährstoffe",
    bullets: [
      "Protein zuerst setzen, dann Fett (~0,6–1,0 g/kg), Rest Kohlenhydrate.",
      "Kohlenhydrate füllen Glykogenspeicher und stützen Trainingsleistung.",
      "Ballaststoffe (Gemüse, Vollkorn, Hülsenfrüchte) helfen Sättigung und Verdauung.",
      "Mikronährstoffe kommen aus abwechslungsreicher Kost — Supplements ersetzen keine Basisernährung.",
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
    title: "Gewichtsstagnation (Cut & Aufbau)",
    bullets: [
      "Kurzfristige Waagen-Stagnation ≠ Fettverlust/Zuwachs gestoppt (Wasser/Glykogen).",
      "Cut: oft unterschätzte Kalorien, weniger NEAT, zu hartes Defizit oder Schlafmangel.",
      "Aufbau: oft zu wenig Kalorien/Protein, zu viel Cardio oder schwache Progression.",
      "Prüfe 7–14-Tage-Durchschnitt statt Einzelmessungen.",
      "Nach längerem Cut: kurze Maintenance oder Refeed — kein Crash-Dieting.",
    ],
  },
  hypertrophy: {
    title: "Muskelaufbau (Hypertrophie)",
    bullets: [
      "Hauptreiz: mechanische Spannung über progressive Overload (Gewicht, Reps, Sätze, Kontrolle).",
      "Wiederholungen oft 5–12+ bei ca. 0–3 RIR; volle ROM wo die Übung es hergibt.",
      "Exzentrische Phase bewusst kontrollieren; konzentrisch explosiv, aber sauber.",
      "10–20+ harte Sätze/Muskelgruppe/Woche als Startkorridor — individuell anpassen.",
      "Muskelproteinsynthese braucht genug Protein + Kalorien + Schlaf; Training allein reicht nicht.",
      "Periodisierung (Belastung/Erholung wechseln) verhindert Dauerplateaus.",
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
      "RIR 0–3 = nah am Muskelversagen; Anfänger oft eher 2–4 RIR (RPE ~6–8).",
      "Mehr Volumen hilft nur, wenn Recovery mitkommt — Qualität > endlose Sätze.",
      "Pausen: Isolation ~60–90 s, schwere Mehrgelenksübungen 2–3+ Min.",
      "Satzpausen und Frequenz steuern Ermüdung ebenso wie die Satzzahl.",
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
      "Stress und hoher Ruhepuls können Erholung verzögern — Belastung dann dosieren.",
      "Ermüdungsmanagement: Volumen, Intensität und Lebensstress zusammen betrachten.",
    ],
  },
  sleep: {
    title: "Schlaf",
    bullets: [
      "Ziel: regelmäßig ~7–9 h; schlechter Schlaf senkt Leistung und Appetitkontrolle.",
      "Nach schlechter Nacht: Training verkürzen/Intensität senken oder Technikarbeit — kein Ego-PR.",
      "Koffein und Screens abends können Schlafqualität verschlechtern.",
      "Schlaf ist einer der stärksten Hebel für Muskelregeneration und Insulinsensitivität.",
    ],
  },
  weight_trend: {
    title: "Gewicht & Fortschritt",
    bullets: [
      "Nutze 7-Tage-Mittelwerte und Fotos/Maße neben der Waage.",
      "Cheat Meals erhöhen oft Glykogen + Wasser — Anstieg am nächsten Tag ist meist kein Fettzuwachs.",
      "Plateaus 1–2 Wochen sind normal; erst danach Kalorien/NEAT/Training prüfen.",
      "Körperzusammensetzung ändert sich langsamer als die Waage — Trend > Tageswert.",
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
