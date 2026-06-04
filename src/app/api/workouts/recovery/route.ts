import { auth } from "@/lib/auth";
import { loadMuscleRecovery } from "@/lib/recovery-service";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const snapshot = await loadMuscleRecovery(session.user.id);
    return jsonOk({
      recovery: snapshot.muscles,
      highlights: snapshot.highlights,
      deloadRecommended: snapshot.deloadRecommended,
      fatigueScore: snapshot.fatigueScore,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
