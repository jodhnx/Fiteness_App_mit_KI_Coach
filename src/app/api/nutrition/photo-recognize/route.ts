import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { aiLimitExceededResponse } from "@/lib/security/ai-rate-limit";
import { logAIUsage } from "@/lib/openai";

/**
 * KI-Lebensmittelerkennung per Foto.
 * Nutzt OPENAI_API_KEY wenn vorhanden; sonst freundliche Fallback-Antwort.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limited = await aiLimitExceededResponse(
      session.user.id,
      ["photo-recognize"],
      8
    );
    if (limited) return limited;

    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof Blob)) {
      return jsonError("Kein Bild hochgeladen");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonOk({
        name: null,
        suggestion:
          "Foto empfangen — OpenAI-Key fehlt. Bitte Lebensmittel manuell suchen oder Barcode scannen.",
      });
    }

    const buf = Buffer.from(await image.arrayBuffer());
    const b64 = buf.toString("base64");
    const mime = image.type || "image/jpeg";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Identifiziere das Lebensmittel auf dem Foto. Antworte NUR als JSON: {"name":"...","estimatedCalories":number|null,"notes":"..."}',
              },
              {
                type: "image_url",
                image_url: { url: `data:${mime};base64,${b64}` },
              },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      return jsonOk({
        name: null,
        suggestion: "Bildanalyse vorübergehend nicht verfügbar — bitte manuell suchen.",
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    await logAIUsage(
      session.user.id,
      "photo-recognize",
      data.usage?.total_tokens ?? Math.ceil(raw.length / 4),
      process.env.OPENAI_VISION_MODEL || "gpt-4o-mini"
    );
    let parsed: { name?: string; estimatedCalories?: number; notes?: string } = {};
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch {
      parsed = { name: raw.slice(0, 80) };
    }

    return jsonOk({
      name: parsed.name ?? null,
      estimatedCalories: parsed.estimatedCalories ?? null,
      suggestion: parsed.name
        ? `Erkannt: ${parsed.name}${
            parsed.estimatedCalories ? ` (~${parsed.estimatedCalories} kcal)` : ""
          }. Bitte in der Suche bestätigen.`
        : "Nichts erkannt — manuell suchen.",
      notes: parsed.notes ?? null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
