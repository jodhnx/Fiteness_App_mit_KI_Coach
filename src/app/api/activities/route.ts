import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import {
  createActivity,
  listActivities,
  getActivityWeekSummary,
  computeAvgSpeedKmh,
} from "@/lib/activity-service";

const createSchema = z.object({
  type: z.enum([
    "RUNNING",
    "JOGGING",
    "CYCLING",
    "HIKING",
    "WALKING",
    "SWIMMING",
    "ROWING",
    "OTHER",
  ]),
  durationSec: z.coerce.number().int().positive().max(86400),
  distanceM: z.coerce.number().positive().max(500_000).optional(),
  caloriesBurned: z.coerce.number().int().positive().max(10000).optional(),
  elevationM: z.coerce.number().optional(),
  notes: z.string().max(500).optional(),
  avgSpeedKmh: z.coerce.number().positive().max(120).optional(),
  startedAt: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const [activities, week] = await Promise.all([
      listActivities(session.user.id, 40),
      getActivityWeekSummary(session.user.id),
    ]);
    return jsonOk({ activities, week });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const { awardXPForAction } = await import("@/lib/gamification");
    const activity = await createActivity(session.user.id, {
      ...parsed.data,
      startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : undefined,
      avgSpeedKmh:
        parsed.data.avgSpeedKmh ??
        computeAvgSpeedKmh(parsed.data.distanceM, parsed.data.durationSec) ??
        undefined,
    });
    await awardXPForAction(session.user.id, "ACTIVITY_COMPLETED");
    return jsonOk({ activity }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
