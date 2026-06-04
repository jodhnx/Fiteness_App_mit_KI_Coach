import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return jsonError("Keine Berechtigung", 403);
    }

    const [userCount, sessionCount, aiUsage, errors, logs] = await Promise.all([
      prisma.user.count(),
      prisma.workoutSession.count(),
      prisma.aIUsageLog.aggregate({ _sum: { tokens: true }, _count: true }),
      prisma.errorReport.findMany({
        where: { resolved: false },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      prisma.activityLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { workoutPlans: true, aiChats: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return jsonOk({
      userCount,
      sessionCount,
      aiTokens: aiUsage._sum.tokens ?? 0,
      aiRequests: aiUsage._count,
      errors,
      logs,
      users,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
