import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { duplicateWorkoutPlan } from "@/lib/workout-plans";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const plan = await duplicateWorkoutPlan(session.user.id, id);
    return jsonOk({ plan }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
