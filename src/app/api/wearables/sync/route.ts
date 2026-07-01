import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { syncAllWearables } from "@/lib/health/health-sync-service";
import { z } from "zod";

const schema = z.object({
  sinceDays: z.number().int().min(1).max(30).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    const sinceDays = parsed.success ? parsed.data.sinceDays ?? 7 : 7;

    const result = await syncAllWearables(session.user.id, sinceDays);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const result = await syncAllWearables(session.user.id, 3);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
