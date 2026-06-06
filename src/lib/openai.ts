import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const COACH_SYSTEM_PROMPT = `Du bist der NEXFORM Coach – ein professioneller, motivierender Fitness- und Ernährungscoach.
Antworte auf Deutsch. Gib konkrete, sichere Empfehlungen.
Erstelle strukturierte Trainings- und Ernährungspläne wenn gewünscht.
Analysiere Fortschritte basierend auf den Nutzerdaten im Kontext.
Keine medizinischen Diagnosen – verweise bei Gesundheitsfragen an Ärzte.`;

export async function logAIUsage(
  userId: string | null,
  endpoint: string,
  tokens: number,
  model?: string
) {
  await prisma.aIUsageLog.create({
    data: { userId: userId ?? undefined, endpoint, tokens, model },
  });
}

export async function chatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  userId: string | null
) {
  if (!openai) {
    return {
      content:
        "OpenAI API ist nicht konfiguriert. Bitte OPENAI_API_KEY in der .env Datei setzen.",
      tokens: 0,
    };
  }
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });
  const content = response.choices[0]?.message?.content ?? "Keine Antwort erhalten.";
  const tokens = response.usage?.total_tokens ?? 0;
  await logAIUsage(userId, "chat", tokens, "gpt-4o-mini");
  return { content, tokens };
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
