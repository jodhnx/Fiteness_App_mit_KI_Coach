import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { createPlanFromCatalog } from "@/lib/workout-plans";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

const schema = z.object({
  catalogKey: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const plan = await createPlanFromCatalog(
      session.user.id,
      parsed.data.catalogKey,
      parsed.data.name
    );
    return jsonOk({ plan }, 201);
  } catch (e) {
    console.error("PLAN ADOPT ERROR:", e);
    return handleApiError(e);
  }
}
