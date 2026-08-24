import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { aiLimitExceededResponse } from "@/lib/security/ai-rate-limit";
import { logAIUsage } from "@/lib/openai";

export type FoodAIItem = {
  id: string;
  name: string;
  estimatedGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Macros originally returned for estimatedGrams — used for rescaling */
  baseGrams: number;
  baseCalories: number;
  baseProteinG: number;
  baseCarbsG: number;
  baseFatG: number;
};

export type FoodAIResult = {
  items: FoodAIItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  disclaimer: string;
  errorCode?: "missing_key" | "openai_error" | "parse_error" | "empty";
  rawText?: string;
};

const VISION_PROMPT = `Du bist ein Ernährungsexperte. Analysiere das Foto und erkenne alle sichtbaren Speisen/Lebensmittel.

Antworte AUSSCHLIESSLICH als JSON:
{
  "items": [
    {
      "name": "Cheeseburger",
      "estimatedGrams": 120,
      "calories": 300,
      "proteinG": 15,
      "carbsG": 30,
      "fatG": 12
    }
  ]
}

Regeln:
- Pro sichtbares Lebensmittel/Komponente ein Eintrag (z.B. Burger + Pommes = 2 Items)
- Realistische Grammschätzung für die sichtbare Portion
- Nährwerte für GENAU diese geschätzte Menge (nicht pro 100g)
- Markennamen nur wenn klar erkennbar
- Wenn nichts erkennbar: items = []
- Maximal 8 Items
- Deutsche Bezeichnungen`;

function totals(items: FoodAIItem[]) {
  return items.reduce(
    (acc, it) => ({
      calories: acc.calories + it.calories,
      proteinG: acc.proteinG + it.proteinG,
      carbsG: acc.carbsG + it.carbsG,
      fatG: acc.fatG + it.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}

function emptyResult(
  disclaimer: string,
  errorCode: FoodAIResult["errorCode"]
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

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const limited = await aiLimitExceededResponse(session.user.id, ["food-ai"], 8);
    if (limited) return limited;

    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof Blob)) {
      return jsonError("Kein Bild hochgeladen");
    }

    if (image.size > 10 * 1024 * 1024) {
      return jsonError("Bild zu groß (max. 10 MB)");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonOk(
        emptyResult(
          "Food AI ist nicht konfiguriert (OPENAI_API_KEY fehlt). Bitte manuell hinzufügen.",
          "missing_key"
        )
      );
    }

    const buf = Buffer.from(await image.arrayBuffer());
    const b64 = buf.toString("base64");
    const mime = image.type || "image/jpeg";
    const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
                image_url: { url: `data:${mime};base64,${b64}`, detail: "low" },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.15,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[food-ai] OpenAI error", res.status, errBody);
      return jsonOk(
        emptyResult(
          "Foto konnte nicht analysiert werden. Bitte erneut versuchen oder manuell hinzufügen.",
          "openai_error"
        )
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
      data.usage?.total_tokens ?? Math.ceil(raw.length / 4),
      model
    );

    let items: FoodAIItem[] = [];
    try {
      const parsed = JSON.parse(raw) as {
        items?: {
          name?: string;
          estimatedGrams?: number;
          calories?: number;
          proteinG?: number;
          carbsG?: number;
          fatG?: number;
        }[];
      };
      items = (parsed.items ?? []).slice(0, 8).map((it, i) => {
        const grams = Math.max(1, Math.round(Number(it.estimatedGrams) || 100));
        const calories = Math.max(0, Math.round(Number(it.calories) || 0));
        const proteinG = Math.max(0, Number((Number(it.proteinG) || 0).toFixed(1)));
        const carbsG = Math.max(0, Number((Number(it.carbsG) || 0).toFixed(1)));
        const fatG = Math.max(0, Number((Number(it.fatG) || 0).toFixed(1)));
        return {
          id: `ai-${i}-${Date.now()}`,
          name: String(it.name ?? "Unbekannt").slice(0, 80),
          estimatedGrams: grams,
          calories,
          proteinG,
          carbsG,
          fatG,
          baseGrams: grams,
          baseCalories: calories,
          baseProteinG: proteinG,
          baseCarbsG: carbsG,
          baseFatG: fatG,
        };
      });
    } catch {
      return jsonOk(
        emptyResult(
          "Analyse-Antwort konnte nicht gelesen werden. Bitte erneut versuchen.",
          "parse_error"
        )
      );
    }

    if (items.length === 0) {
      return jsonOk(
        emptyResult(
          "Keine Lebensmittel erkannt — anderes Foto versuchen oder manuell hinzufügen.",
          "empty"
        )
      );
    }

    const total = totals(items);

    return jsonOk<FoodAIResult>({
      items,
      totalCalories: Math.round(total.calories),
      totalProteinG: Number(total.proteinG.toFixed(1)),
      totalCarbsG: Number(total.carbsG.toFixed(1)),
      totalFatG: Number(total.fatG.toFixed(1)),
      disclaimer:
        "Geschätzte Werte — bitte Portion überprüfen. Fotoanalyse ist nicht exakt.",
      rawText: process.env.NODE_ENV === "development" ? raw : undefined,
    });
  } catch (e) {
    console.error("[food-ai]", e);
    return handleApiError(e);
  }
}
