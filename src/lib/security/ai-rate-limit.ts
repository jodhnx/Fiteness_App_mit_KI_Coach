import { prisma } from "@/lib/prisma";

/**
 * Durable AI rate limit via existing AIUsageLog — works across Vercel instances.
 * No schema change. In-memory rateLimit remains for login/register.
 */
export async function rateLimitAiUsage(
  userId: string,
  endpoints: string[],
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number }> {
  const since = new Date(Date.now() - windowMs);
  try {
    const used = await prisma.aIUsageLog.count({
      where: {
        userId,
        endpoint: { in: endpoints },
        createdAt: { gte: since },
      },
    });
    if (used >= limit) {
      return { success: false, remaining: 0 };
    }
    return { success: true, remaining: Math.max(0, limit - used - 1) };
  } catch (e) {
    console.error("[ai-rate-limit]", e);
    // Fail open locally if the log table is unreachable — still blocked by in-memory limit
    return { success: true, remaining: limit };
  }
}
