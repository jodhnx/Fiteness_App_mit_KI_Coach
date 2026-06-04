import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { logSleep, type SleepQuality } from "@/lib/sleep-service";
import { z } from "zod";
import { invalidateCache } from "@/lib/client-cache";

const schema = z.object({
  sleepHours: z.number().min(3).max(14),
  sleepQuality: z.enum(["POOR", "MEDIUM", "GOOD", "EXCELLENT"]).optional(),
  recoveryRating: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    await logSleep(session.user.id, {
      sleepHours: parsed.data.sleepHours,
      sleepQuality: parsed.data.sleepQuality as SleepQuality | undefined,
      recoveryRating: parsed.data.recoveryRating,
    });

    invalidateCache("activities-dashboard");
    invalidateCache("home-data");
    invalidateCache("coach-insights");

    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
