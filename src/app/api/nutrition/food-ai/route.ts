import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { aiLimitExceededResponse } from "@/lib/security/ai-rate-limit";
import { logAIUsage } from "@/lib/openai";
import {
  FOOD_AI_ALLOWED_MIME,
  FOOD_AI_MAX_BYTES,
  foodAiItemsFromParsed,
  foodAiResponseSchema,
  foodAiTotals,
  type FoodAIErrorCode,
  type FoodAIResult,
} from "@/lib/food/food-ai-schema";

export type { FoodAIItem, FoodAIResult, FoodAIErrorCode } from "@/lib/food/food-ai-schema";

const VISION_PROMPT = `Du bist ein Ernährungsexperte. Analysiere das Foto und erkenne alle sichtbaren Speisen/Lebensmittel.

Antworte AUSSCHLIESSLICH als JSON-Objekt in genau diesem Schema:
{
  "foods": [
    {
      "name": "Pizza Margherita",
      "estimatedGrams": 250,
      "calories": 650,
      "protein": 25,
      "carbs": 75,
      "fat": 25,
      "confidence": 0.87,
      "brand": null,
      "description": null
    }
  ]
}

Regeln:
- Pro sichtbares Lebensmittel/Komponente ein Eintrag (z.B. Burger + Pommes = 2 Items)
- Realistische Grammschätzung für die sichtbare Portion
- Nährwerte für GENAU diese geschätzte Menge (nicht pro 100g)
- confidence zwischen 0 und 1 (wie sicher die Erkennung ist)
- Markennamen nur wenn klar erkennbar, sonst null
- Wenn nichts zuverlässig erkennbar: foods = []
- Maximal 8 Items
- Deutsche Bezeichnungen
- Kein Freitext außerhalb des JSON`;

const OPENAI_TIMEOUT_MS = 45_000;

function emptyResult(
  disclaimer: string,
  errorCode: FoodAIErrorCode
): FoodAIResult {
  return {
    items: [],
    totalCalories: 0,
    totalProteinG: 0,
    totalCarbsG: 0,
    totalFatG: 0,
    disclaimer,
    errorCode,
  };
}

function normalizeMime(raw: string | undefined | null): string {
  const t = (raw || "").toLowerCase().trim();
  if (t === "image/jpg") return "image/jpeg";
  return t;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Nicht angemeldet", 401);
    }

    const limited = await aiLimitExceededResponse(session.user.id, ["food-ai"], 8);
    if (limited) return limited;

    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof Blob) || image.size <= 0) {
      return jsonError("Kein Bild hochgeladen", 400);
    }

    if (image.size > FOOD_AI_MAX_BYTES) {
      return jsonError("Bild zu groß (max. 10 MB)", 400);
    }

    const mime = normalizeMime(image.type);
    const fileName =
      typeof (image as File).name === "string" ? (image as File).name : "";
    const mimeOk =
      FOOD_AI_ALLOWED_MIME.has(mime) ||
      /\.(jpe?g|png|webp)$/i.test(fileName);
    if (!mimeOk) {
      return jsonOk(
        emptyResult(
          "Dieses Bild konnte nicht verarbeitet werden. Bitte JPEG, PNG oder WebP verwenden.",
          "invalid_image"
        )
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[food-ai] OPENAI_API_KEY missing");
      return jsonOk(
        emptyResult(
          "Food AI ist nicht konfiguriert. Bitte manuell hinzufügen.",
          "missing_key"
        )
      );
    }

    const buf = Buffer.from(await image.arrayBuffer());
    if (buf.byteLength < 32) {
      return jsonOk(
        emptyResult(
          "Dieses Bild konnte nicht verarbeitet werden.",
          "invalid_image"
        )
      );
    }

    const safeMime = FOOD_AI_ALLOWED_MIME.has(mime) ? mime : "image/jpeg";
    const b64 = buf.toString("base64");
    const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: VISION_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${safeMime};base64,${b64}`,
                    detail: "low",
                  },
                },
              ],
            },
          ],
          max_tokens: 900,
          temperature: 0.15,
        }),
      });
    } catch (err) {
      const aborted =
        err instanceof Error &&
        (err.name === "AbortError" || /aborted/i.test(err.message));
      console.error("[food-ai] OpenAI fetch failed", aborted ? "timeout" : err);
      return jsonOk(
        emptyResult(
          "Foto konnte nicht analysiert werden.",
          aborted ? "timeout" : "openai_error"
        )
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[food-ai] OpenAI error", res.status, errBody.slice(0, 400));
      if (res.status === 401 || res.status === 403) {
        return jsonOk(
          emptyResult("Foto konnte nicht analysiert werden.", "openai_error")
        );
      }
      if (res.status === 429) {
        return jsonOk(
          emptyResult(
            "Zu viele Anfragen. Bitte kurz warten und erneut versuchen.",
            "rate_limit"
          )
        );
      }
      return jsonOk(
        emptyResult("Foto konnte nicht analysiert werden.", "openai_error")
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const raw = data.choices?.[0]?.message?.content ?? "";
    await logAIUsage(
      session.user.id,
      "food-ai",
      data.usage?.total_tokens ?? Math.ceil(Math.max(raw.length, 1) / 4),
      model
    );

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      console.error("[food-ai] malformed JSON from model");
      return jsonOk(
        emptyResult(
          "Foto konnte nicht analysiert werden.",
          "parse_error"
        )
      );
    }

    const validated = foodAiResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.error("[food-ai] schema validation failed", validated.error.flatten());
      return jsonOk(
        emptyResult(
          "Foto konnte nicht analysiert werden.",
          "parse_error"
        )
      );
    }

    const items = foodAiItemsFromParsed(validated.data.foods);
    if (items.length === 0) {
      return jsonOk(
        emptyResult(
          "Wir konnten auf dem Foto kein Lebensmittel zuverlässig erkennen.",
          "empty"
        )
      );
    }

    const total = foodAiTotals(items);

    return jsonOk<FoodAIResult>({
      items,
      totalCalories: Math.round(total.calories),
      totalProteinG: Number(total.proteinG.toFixed(1)),
      totalCarbsG: Number(total.carbsG.toFixed(1)),
      totalFatG: Number(total.fatG.toFixed(1)),
      disclaimer:
        "Geschätzte Werte — bitte Portion und Nährwerte prüfen. Fotoanalyse ist nicht exakt.",
    });
  } catch (e) {
    console.error("[food-ai]", e);
    return handleApiError(e);
  }
}
