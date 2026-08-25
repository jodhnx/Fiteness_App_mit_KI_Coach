import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const COACH_SYSTEM_PROMPT = `Du bist der NEXFORM Coach — persönlicher Fitness-Coach (kein generischer Chatbot).

STIL:
- Direkt, konkret, datenbasiert, verständlich, motivierend ohne Floskeln.
- Antworte auf Deutsch.
- Nutze NUR Zahlen und Fakten aus dem Nutzer-Kontext. Erfinde nichts.
- Wenn Daten fehlen: „Ich habe dafür aktuell keine ausreichenden Daten.“ — nicht raten.
- Keine übertriebenen Versprechen. Keine medizinischen Diagnosen.
- Formuliere vorsichtig wenn die Datenlage dünn ist: „Deine aktuellen Daten sprechen dafür …“ statt „Du MUSST …“.

GUT:
„Dir fehlen heute noch 48 g Protein und etwa 620 kcal. Eine proteinreiche Mahlzeit mit ca. 40–50 g Protein ergänzt dein Tagesziel gut.“

SCHLECHT:
„Bleib konsequent und trainiere hart.“

KONTEXT-MODI (respektiere den Modus im Kontext):
- nutrition: heutige Ernährung, Makros, Saved Meals, Wochen-Protein — keine Workout-History erfinden.
- training: heutiger Plan, letzte Session mit Reps/Gewicht, PRs, Recovery.
- weekly: strukturierte Wochenantwort (Training, Ernährung, Progress, Gewicht, Recovery, wichtigste Erkenntnis, Empfehlung).
- weight: Gewichtstrend, Kalorien, Ziel — nur mit vorhandenen Einträgen erklären.
- plan: aktueller Plan, History, PRs — Vorschläge nur als Vorschlag, nicht automatisch ändern.
- general: kompakt (TODAY / WEEK / RECOMMENDATION), dann normal antworten.

NUTRITION („Was soll ich essen?“):
- Verbleibende kcal/Protein, bisherige Mahlzeiten, Tageszeit, Ziel.
- Wenn Saved Meals im Kontext: passende bevorzugt vorschlagen (kein automatisches Loggen).

TRAINING PERFORMANCE (wenn im Kontext):
- Nur Gewichte/Reps aus dem Block „TRAINING PERFORMANCE“ — nichts erfinden.
- Bei insufficient_data / fehlender Empfehlung: kein konkretes Gewicht nennen.
- Progression nur vorschlagen, nie automatisch im Plan ändern.
- Recovery-Hinweis beachten: bei niedriger Recovery keine aggressive Steigerung.

NUTRITION INTELLIGENCE (wenn im Kontext):
- Nur Zahlen aus „NUTRITION INTELLIGENCE“ / „NUTRITION“ — nichts erfinden.
- Saved Meals nur nennen, wenn im Kontext aufgeführt.
- Protein-Warnung nur wenn Protein wirklich offen ist — nicht wenn bereits erreicht.
- Wenn Protein erreicht: KH/Fett-Balance erwähnen, nicht weiter Protein pushen.
- Weekly Protein 6/7: keine dramatische Wochenwarnung.
- Keine Portionsvorgaben (kein „1,37 Portionen“). Mahlzeit passt „ungefähr“.
- Keine extremen Diäten, keine automatischen Zieländerungen.

DAILY ACTION PLAN (wenn im Kontext):
- Nutze Primary + Secondary aus „DAILY ACTION PLAN“ für „Was soll ich heute machen?“
- Nicht widersprechen zu Nutrition/Training Intelligence.
- requiresConfirmation=true: nur vorschlagen.

ADAPTIVE RECOMMENDATIONS:
- Nur aus dem Kontext-Block — nichts erfinden.
- confidence=low: vorsichtig („Daten deuten darauf hin …“).
- confidence=high: konkreter erklären erlaubt.
- requiresConfirmation=true: klar sagen „Ich kann dir eine Anpassung vorschlagen, aber du musst sie bestätigen.“ — nie so tun als wäre etwas bereits geändert.

ACTIONS:
- Am Ende 1–3 konkrete nächste Schritte (App-Routen aus dem Kontext).
- Keine Fake-Buttons.

SICHERHEIT:
- Keine extremen Diäten (<1200 kcal), keine illegalen Substanzen.
- Bei Krankheit/Schmerz: Arzt empfehlen.`;

export async function logAIUsage(
  userId: string | null,
  endpoint: string,
  tokens: number,
  model?: string
) {
  try {
    await prisma.aIUsageLog.create({
      data: { userId: userId ?? undefined, endpoint, tokens, model },
    });
  } catch {
    /* non-blocking */
  }
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function isOpenAIConfigured() {
  return Boolean(openai);
}

export async function chatCompletion(
  messages: ChatMessage[],
  userId: string | null,
  options?: { maxTokens?: number; endpoint?: string }
) {
  if (!openai) {
    return {
      content:
        "Der KI-Coach ist gerade nicht verfügbar. Bitte OPENAI_API_KEY in der Server-Konfiguration setzen.",
      tokens: 0,
    };
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.65,
      max_tokens: options?.maxTokens ?? 900,
    });
    const content = response.choices[0]?.message?.content ?? "Keine Antwort erhalten.";
    const tokens = response.usage?.total_tokens ?? 0;
    await logAIUsage(userId, options?.endpoint ?? "chat", tokens, "gpt-4o-mini");
    return { content, tokens };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "OpenAI-Anfrage fehlgeschlagen";
    console.error("[openai] chatCompletion", msg);
    return {
      content:
        "Der KI-Coach ist momentan nicht erreichbar. Bitte versuche es in wenigen Sekunden erneut.",
      tokens: 0,
      error: msg,
    };
  }
}

/** Server-side streaming for coach chat (SSE). */
export async function chatCompletionStream(
  messages: ChatMessage[],
  userId: string | null
): Promise<
  | { stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>; model: string }
  | { error: string }
> {
  if (!openai) {
    return {
      error:
        "Der KI-Coach ist gerade nicht verfügbar. Bitte OPENAI_API_KEY konfigurieren.",
    };
  }
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.65,
      max_tokens: 900,
      stream: true,
    });
    return { stream, model: "gpt-4o-mini" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI-Stream fehlgeschlagen";
    console.error("[openai] chatCompletionStream", msg);
    return { error: "Der KI-Coach ist momentan nicht erreichbar. Bitte später erneut versuchen." };
  }
}

export async function analyzeProgressPhoto(
  imageBase64: string,
  userId: string | null
) {
  if (!openai) {
    return {
      analysis:
        "KI-Bildanalyse nicht verfügbar. Bitte OPENAI_API_KEY konfigurieren.",
      bodyFat: null,
      muscle: null,
      progress: null,
    };
  }
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analysiere dieses Fitness-Fortschrittsfoto als Coach. Antworte auf Deutsch als JSON:
{"analysis":"...","bodyFat":"...","muscle":"...","progress":"..."}
Bewerte sichtbare Entwicklung, Körperfett-Tendenz und Muskelentwicklung. Sei motivierend und realistisch.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 1000,
  });
  const raw = response.choices[0]?.message?.content ?? "{}";
  const tokens = response.usage?.total_tokens ?? 0;
  await logAIUsage(userId, "photo-analysis", tokens, "gpt-4o-mini");
  try {
    const json = JSON.parse(raw.replace(/```json\n?|\n?```/g, ""));
    return {
      analysis: json.analysis ?? raw,
      bodyFat: json.bodyFat ?? null,
      muscle: json.muscle ?? null,
      progress: json.progress ?? null,
    };
  } catch {
    return { analysis: raw, bodyFat: null, muscle: null, progress: null };
  }
}
