export type LiveDraftSet = {
  id: string;
  exerciseLibraryId: string | null;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  restSeconds: number | null;
  completed: boolean;
  notes: string | null;
  saveState?: "ok" | "pending" | "error";
};

export type LiveDraftSession = {
  id: string;
  name: string;
  startedAt: string;
  status?: string;
  sets: LiveDraftSet[];
  workoutDayId?: string | null;
  workoutPlanId?: string | null;
};

export const liveDraftStorageKey = (sessionId: string) =>
  `nexform:live-draft:${sessionId}`;

export function mergeLiveSession(
  local: LiveDraftSession | null,
  remote: LiveDraftSession
): LiveDraftSession {
  if (!local || local.id !== remote.id) return remote;

  const localById = new Map(local.sets.map((s) => [s.id, s]));
  const merged = remote.sets.map((remoteSet) => {
    const loc = localById.get(remoteSet.id);
    if (!loc) return remoteSet;
    if (loc.saveState === "pending" || loc.saveState === "error") {
      return {
        ...remoteSet,
        weightKg: loc.weightKg,
        reps: loc.reps,
        rpe: loc.rpe,
        completed: loc.completed,
        saveState: loc.saveState,
      };
    }
    return { ...remoteSet, saveState: loc.saveState ?? "ok" };
  });

  const remoteIds = new Set(remote.sets.map((s) => s.id));
  const temps = local.sets.filter(
    (s) => s.id.startsWith("temp-set-") && !remoteIds.has(s.id)
  );

  return { ...remote, sets: [...merged, ...temps] };
}

export function nextSetNumber(sets: { setNumber: number }[]): number {
  return sets.reduce((max, s) => Math.max(max, s.setNumber), 0) + 1;
}

export function readLiveDraft(sessionId: string): LiveDraftSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(liveDraftStorageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LiveDraftSession;
    if (!parsed?.id || parsed.id !== sessionId || !Array.isArray(parsed.sets)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeLiveDraft(session: LiveDraftSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(liveDraftStorageKey(session.id), JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearLiveDraft(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(liveDraftStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}
