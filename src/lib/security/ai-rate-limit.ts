import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/api-response";

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
    return { success: true, remaining: limit };
  }
}

/** Returns a 429 Response when the durable AI budget is exhausted. */
export async function aiLimitExceededResponse(
  userId: string,
  endpoints: string[],
  limit: number,
  windowMs = 60_000
) {
  const { success } = await rateLimitAiUsage(userId, endpoints, limit, windowMs);
  if (success) return null;
  return jsonError("Zu viele KI-Anfragen. Bitte kurz warten.", 429);
}
