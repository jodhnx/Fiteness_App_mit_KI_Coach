import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { buildWorkoutJourney } from "@/lib/workout-journey";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const journey = await buildWorkoutJourney(session.user.id);
    return jsonOk({ journey });
  } catch (e) {
    return handleApiError(e);
  }
}
