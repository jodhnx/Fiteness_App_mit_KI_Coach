import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const recent = await prisma.recentExercise.findMany({
      where: { userId: session.user.id },
      include: { exercise: true },
      orderBy: { lastUsedAt: "desc" },
      take: 15,
    });

    return jsonOk({ exercises: recent.map((r) => ({ ...r.exercise, lastUsedAt: r.lastUsedAt, useCount: r.useCount })) });
  } catch (e) {
    return handleApiError(e);
  }
}
