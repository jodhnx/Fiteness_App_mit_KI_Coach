import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { upsertTodaySteps } from "@/lib/activity-health";
import { z } from "zod";

const schema = z.object({
  steps: z.number().int().min(0).max(200_000),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Schrittzahl" }, { status: 400 });
  }

  try {
    await upsertTodaySteps(session.user.id, parsed.data.steps);
    if (parsed.data.steps >= 10000) {
      const { awardXPForAction } = await import("@/lib/gamification");
      await awardXPForAction(session.user.id, "STEPS_10K");
    }
    return NextResponse.json({ ok: true, steps: parsed.data.steps });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
