import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  PENDING_LIVE_SESSION_KEY,
  patchHomeActiveSession,
} from "@/lib/workout-cache-sync";

type StartPayload = {
  action: "start";
  name: string;
  workoutPlanId?: string;
  workoutDayId?: string;
};

type SessionRow = {
  id: string;
  name: string;
  startedAt: string;
  sets: unknown[];
};

export function primeLiveSession(session: SessionRow) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_LIVE_SESSION_KEY, JSON.stringify(session));
  patchHomeActiveSession({
    id: session.id,
    name: session.name,
    startedAt: session.startedAt,
  });
}

export async function startWorkoutAndNavigate(
  router: AppRouterInstance,
  payload: StartPayload
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const res = await fetch("/api/workouts/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: (data as { error?: string }).error ?? "Training konnte nicht gestartet werden",
    };
  }
  const session = (data as { session: SessionRow }).session;
  primeLiveSession(session);
  router.push(`/workouts/live/${session.id}`);
  return { ok: true, sessionId: session.id };
}
