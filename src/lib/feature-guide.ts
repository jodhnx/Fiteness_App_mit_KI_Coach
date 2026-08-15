/** First-run feature guides & page intros — localStorage only, non-destructive. */

const SEEN_PREFIX = "nexform:guide:";
const TOUR_DONE = "nexform:feature-tour-v1";

export type GuidePageId =
  | "home"
  | "workouts"
  | "nutrition"
  | "progress"
  | "coach"
  | "geraete"
  | "social";

export const PAGE_INTROS: Record<
  GuidePageId,
  { title: string; body: string; tips: string[] }
> = {
  home: {
    title: "Dein Tagesüberblick",
    body: "Hier siehst du Kalorien, Schritte, Training und Tipps auf einen Blick.",
    tips: [
      "Widgets unten anpassen",
      "Profilbild öffnet Einstellungen & Geräte",
      "Tippe auf Ringe für Details",
    ],
  },
  workouts: {
    title: "Training",
    body: "Starte Workouts, verwalte Pläne und tracke Sätze in Echtzeit.",
    tips: ["Quick Workout für schnelle Sessions", "Live-Modus speichert automatisch"],
  },
  nutrition: {
    title: "Ernährung",
    body: "Tracke Mahlzeiten, Makros und Wasser — Updates erscheinen sofort.",
    tips: ["+ bei Mahlzeiten zum Hinzufügen", "Barcode & Favoriten im Suchfeld"],
  },
  progress: {
    title: "Fortschritt",
    body: "Gewicht, Fotos, Kraft und Aktivität — dein Transformations-Hub.",
    tips: ["Vorher/Nachher-Fotos hochladen", "Umfänge und Diagramme scrollen"],
  },
  coach: {
    title: "KI-Coach",
    body: "Persönliche Tipps zu Training, Ernährung, Schlaf und Regeneration.",
    tips: ["Schnellaktionen für Analysen", "Wochenbericht prüfen"],
  },
  geraete: {
    title: "Geräte & Gesundheit",
    body: "Verbinde Watch oder nutze Smartphone-Sensoren für automatische Schritte.",
    tips: ["Ohne Watch: Smartphone aktivieren", "Sync nach dem Verbinden starten"],
  },
  social: {
    title: "Community",
    body: "Freunde, Challenges und gemeinsame Motivation.",
    tips: ["Freunde per E-Mail einladen", "Challenges mitmachen"],
  },
};

export function hasSeenGuide(id: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SEEN_PREFIX + id) === "1";
  } catch {
    return true;
  }
}

export function markGuideSeen(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_PREFIX + id, "1");
  } catch {
    /* ignore */
  }
}

export function isFeatureTourDone(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TOUR_DONE) === "1";
  } catch {
    return true;
  }
}

export function markFeatureTourDone() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOUR_DONE, "1");
  } catch {
    /* ignore */
  }
}
