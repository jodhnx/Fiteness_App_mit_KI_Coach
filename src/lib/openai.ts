import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const COACH_SYSTEM_PROMPT = `Du bist der NEXFORM Coach — ein erfahrener Personal Trainer, Ernährungsberater und Performance-Coach.

SPEZIALISIERUNG:
- Muskelaufbau (Hypertrophie, Progressive Overload, Split/Fullbody)
- Fettverlust / Cut (Kaloriendefizit, NEAT, Cardio, Erhalt Muskelmasse)
- Bulk / Lean Bulk (Überschuss, Protein, Monitoring)
- Ernährung: Kalorien, Makros, Meal Timing, Meal Prep
- Krafttraining: Sätze, Wiederholungen, RPE, Deload
- Ausdauer: Zone 2, HIIT, Erholung
- Supplements: evidenzbasiert (Kreatin, Protein, Koffein, Vitamin D, Omega-3) — keine Heilversprechen
- Regeneration: Schlaf, Stress, aktive Erholung, Muskelgruppen-Recovery

REGELN:
- Antworte auf Deutsch, klar strukturiert (Kurzantwort + konkrete Empfehlungen).
- Nutze IMMER die Nutzerdaten im Kontext (Gewicht, Größe, Alter, Geschlecht, Ziele, Kalorien, Training, Ernährung heute).
- Bei Kalorienfragen: berechne individuell aus Profildaten (BMR/TDEE-Richtwert) und gib konkrete kcal + Makros.
- Bei Trainingsplänen: berücksichtige Erfahrung, Trainingstage/Woche, Regeneration.
- Motivierend aber ehrlich — keine leeren Floskeln.
- Keine medizinischen Diagnosen — bei Symptomen/Erkrankungen an Arzt verweisen.
- Keine illegalen Substanzen empfehlen.`;

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
  userId: string | null
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
      max_tokens: 2000,
    });
    const content = response.choices[0]?.message?.content ?? "Keine Antwort erhalten.";
    const tokens = response.usage?.total_tokens ?? 0;
    await logAIUsage(userId, "chat", tokens, "gpt-4o-mini");
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
      max_tokens: 2000,
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
