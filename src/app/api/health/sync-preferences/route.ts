import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  getHealthSyncPreferences,
  upsertHealthSyncPreferences,
} from "@/lib/health/health-sync-preferences";
import { z } from "zod";
import type { HealthMetricCategory } from "@/lib/health/types";

const patchSchema = z.record(z.string(), z.boolean());

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const prefs = await getHealthSyncPreferences(session.user.id);
    return jsonOk({ preferences: prefs });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = patchSchema.safeParse(body?.preferences ?? body);
    if (!parsed.success) return jsonError("Ungültige Einstellungen");

    const prefs = parsed.data as Partial<Record<HealthMetricCategory, boolean>>;
    await upsertHealthSyncPreferences(session.user.id, prefs);
    const updated = await getHealthSyncPreferences(session.user.id);
    return jsonOk({ preferences: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
