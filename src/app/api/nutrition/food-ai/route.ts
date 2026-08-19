import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export type FoodAIItem = {
  id: string;
  name: string;
  estimatedGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FoodAIResult = {
  items: FoodAIItem[];
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  disclaimer: string;
  rawText?: string;
};

const VISION_PROMPT = `Du bist ein Ernährungsexperte. Analysiere das Foto und erkenne alle sichtbaren Speisen/Lebensmittel.

Antworte AUSSCHLIESSLICH als JSON im folgenden Format (keine anderen Texte):
{
  "items": [
    {
      "name": "Hühnchenbrust",
      "estimatedGrams": 150,
      "calories": 165,
      "proteinG": 31,
      "carbsG": 0,
      "fatG": 3.6
    }
  ]
}

Regeln:
- Pro Lebensmittel/Komponente ein Eintrag
- Realistische Grammschätzung für sichtbare Portion
- Nährwerte per 100g hochrechnen auf die geschätzte Menge
- Wenn Gericht nicht erkennbar: items = []
- Maximal 8 Items
- Deutsche Lebensmittelbezeichnungen`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

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
      return jsonOk<FoodAIResult>({
        items: [],
        totalCalories: 0,
        totalProteinG: 0,
        totalCarbsG: 0,
        totalFatG: 0,
        disclaimer:
          "Food AI ist nicht konfiguriert. Bitte OPENAI_API_KEY setzen oder Lebensmittel manuell hinzufügen.",
      });
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
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[food-ai] OpenAI error", res.status, errBody);
      return jsonOk<FoodAIResult>({
        items: [],
        totalCalories: 0,
        totalProteinG: 0,
        totalCarbsG: 0,
        totalFatG: 0,
        disclaimer: "Analyse vorübergehend nicht verfügbar. Bitte manuell hinzufügen.",
      });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content ?? "";

    let items: FoodAIItem[] = [];
    try {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { items?: Omit<FoodAIItem, "id">[] };
        items = (parsed.items ?? []).slice(0, 8).map((it, i) => ({
          id: `ai-${i}-${Date.now()}`,
          name: String(it.name ?? "Unbekannt"),
          estimatedGrams: Math.max(1, Math.round(Number(it.estimatedGrams) || 100)),
          calories: Math.max(0, Math.round(Number(it.calories) || 0)),
          proteinG: Math.max(0, Number((Number(it.proteinG) || 0).toFixed(1))),
          carbsG: Math.max(0, Number((Number(it.carbsG) || 0).toFixed(1))),
          fatG: Math.max(0, Number((Number(it.fatG) || 0).toFixed(1))),
        }));
      }
    } catch {
      items = [];
    }

    const total = items.reduce(
      (acc, it) => ({
        calories: acc.calories + it.calories,
        proteinG: acc.proteinG + it.proteinG,
        carbsG: acc.carbsG + it.carbsG,
        fatG: acc.fatG + it.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    return jsonOk<FoodAIResult>({
      items,
      totalCalories: Math.round(total.calories),
      totalProteinG: Number(total.proteinG.toFixed(1)),
      totalCarbsG: Number(total.carbsG.toFixed(1)),
      totalFatG: Number(total.fatG.toFixed(1)),
      disclaimer:
        "Geschätzte Nährwerte — KI-Analyse kann variieren. Bitte Portionen überprüfen.",
      rawText: process.env.NODE_ENV === "development" ? raw : undefined,
    });
  } catch (e) {
    console.error("[food-ai]", e);
    return handleApiError(e);
  }
}
