import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

import { buildPrCenter } from "@/lib/pr-center";
import { buildKeyLiftRecords, buildRecordHighlights } from "@/lib/record-highlights";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const [records, prCenter, keyLifts, highlights] = await Promise.all([
      prisma.personalRecord.findMany({
        where: { userId: session.user.id },
        include: { exercise: true },
        orderBy: { achievedAt: "desc" },
      }),
      buildPrCenter(session.user.id),
      buildKeyLiftRecords(session.user.id),
      buildRecordHighlights(session.user.id),
    ]);

    const byExercise = new Map<string, typeof records>();
    for (const r of records) {
      const list = byExercise.get(r.exerciseLibraryId) ?? [];
      list.push(r);
      byExercise.set(r.exerciseLibraryId, list);
    }

    return jsonOk({ records, byExercise: Object.fromEntries(byExercise), prCenter, keyLifts, highlights });
  } catch (e) {
    return handleApiError(e);
  }
}
