import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { parseYearMonth, yearMonthKey } from "@/lib/nutrition-calendar";
import { nutritionDayUtc } from "@/lib/nutrition-day";

/**
 * Lightweight month metadata — which days have at least one meal item or water.
 * Does NOT load full dashboards (performance).
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const url = new URL(req.url);
    const now = new Date();
    const fallback = yearMonthKey(now.getFullYear(), now.getMonth());
    const parsed = parseYearMonth(url.searchParams.get("month")) ?? parseYearMonth(fallback);
    if (!parsed) return jsonError("Ungültiger Monat", 400);

    const { year, monthIndex0 } = parsed;
    const monthStart = nutritionDayUtc(yearMonthKey(year, monthIndex0) + "-01");
    const nextMonth = monthIndex0 === 11 ? 0 : monthIndex0 + 1;
    const nextYear = monthIndex0 === 11 ? year + 1 : year;
    const monthEndExclusive = nutritionDayUtc(
      yearMonthKey(nextYear, nextMonth) + "-01"
    );

    const [meals, water] = await Promise.all([
      prisma.meal.findMany({
        where: {
          userId: session.user.id,
          date: { gte: monthStart, lt: monthEndExclusive },
          items: { some: {} },
        },
        select: { date: true },
        distinct: ["date"],
      }),
      prisma.waterLog
        .findMany({
          where: {
            userId: session.user.id,
            date: { gte: monthStart, lt: monthEndExclusive },
            amountMl: { gt: 0 },
          },
          select: { date: true },
          distinct: ["date"],
        })
        .catch(() => [] as { date: Date }[]),
    ]);

    const tracked = new Set<string>();
    for (const m of meals) {
      tracked.add(m.date.toISOString().slice(0, 10));
    }
    for (const w of water) {
      tracked.add(w.date.toISOString().slice(0, 10));
    }

    return jsonOk({
      month: yearMonthKey(year, monthIndex0),
      trackedDays: [...tracked].sort(),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
