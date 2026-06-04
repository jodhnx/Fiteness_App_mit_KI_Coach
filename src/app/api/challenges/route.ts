import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadChallengesWithProgress } from "@/lib/challenge-progress";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const challenges = await unstable_cache(
      () => loadChallengesWithProgress(userId),
      [`challenges-${userId}`],
      { revalidate: 60 }
    )();
    const res = jsonOk({ challenges });
    res.headers.set("Cache-Control", "private, max-age=45");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
