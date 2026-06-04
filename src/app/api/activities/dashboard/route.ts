import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadHealthDashboard } from "@/lib/activity-health";
import { listActivities } from "@/lib/activity-service";
import { getSleepWeekStats } from "@/lib/sleep-service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [dashboard, activities, sleepWeek] = await Promise.all([
      loadHealthDashboard(session.user.id),
      listActivities(session.user.id, 40),
      getSleepWeekStats(session.user.id),
    ]);
    const res = NextResponse.json({
      dashboard,
      sleepWeek,
      activities: activities.map((a) => ({
        ...a,
        startedAt: a.startedAt.toISOString(),
      })),
    });
    res.headers.set("Cache-Control", "private, max-age=30");
    return res;
  } catch (e) {
    console.error("[activities/dashboard]", e);
    return NextResponse.json({ error: "Dashboard konnte nicht geladen werden" }, { status: 500 });
  }
}
