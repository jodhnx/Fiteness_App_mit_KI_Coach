export const liveRestStorageKey = (sessionId: string) =>
  `nexform:live-rest:${sessionId}`;

/** Timestamp-based rest — remaining is always derived from endAt / paused remaining. */
export type LiveRestState = {
  startedAt: number | null;
  endAt: number | null;
  pausedAt: number | null;
  remainingMs: number | null;
};

export function emptyLiveRest(): LiveRestState {
  return { startedAt: null, endAt: null, pausedAt: null, remainingMs: null };
}

export function remainingRestMs(state: LiveRestState, now: number): number {
  if (state.pausedAt != null && state.remainingMs != null) {
    return Math.max(0, state.remainingMs);
  }
  if (state.endAt != null) {
    return Math.max(0, state.endAt - now);
  }
  return 0;
}

export function remainingRestSec(state: LiveRestState, now: number): number {
  return Math.ceil(remainingRestMs(state, now) / 1000);
}

export function startRest(seconds: number, now: number): LiveRestState {
  const ms = Math.max(1000, Math.round(seconds * 1000));
  return {
    startedAt: now,
    endAt: now + ms,
    pausedAt: null,
    remainingMs: null,
  };
}

export function clearRest(): LiveRestState {
  return emptyLiveRest();
}

export function pauseRest(state: LiveRestState, now: number): LiveRestState {
  const left = remainingRestMs(state, now);
  if (left <= 0) return emptyLiveRest();
  return {
    startedAt: state.startedAt,
    endAt: state.endAt,
    pausedAt: now,
    remainingMs: left,
  };
}

export function resumeRest(state: LiveRestState, now: number): LiveRestState {
  if (state.pausedAt == null || state.remainingMs == null || state.remainingMs <= 0) {
    return state;
  }
  return {
    startedAt: now,
    endAt: now + state.remainingMs,
    pausedAt: null,
    remainingMs: null,
  };
}

export function addRestSeconds(
  state: LiveRestState,
  extraSec: number,
  now: number
): LiveRestState {
  const extraMs = Math.max(0, extraSec) * 1000;
  if (state.pausedAt != null) {
    return {
      ...state,
      remainingMs: (state.remainingMs ?? 0) + extraMs,
    };
  }
  if (state.endAt != null && state.endAt > now) {
    return { ...state, endAt: state.endAt + extraMs };
  }
  return startRest(extraSec, now);
}

function isRestState(value: unknown): value is LiveRestState {
  if (typeof value !== "object" || value == null) return false;
  const v = value as Record<string, unknown>;
  return (
    ("endAt" in v || "until" in v || "pausedRemainingSec" in v || "remainingMs" in v)
  );
}

/** Accept current timestamp shape and the previous until/pausedRemainingSec shape. */
export function normalizeLiveRest(raw: unknown, now: number): LiveRestState | null {
  if (!isRestState(raw)) return null;
  const v = raw as Record<string, unknown>;

  if (typeof v.endAt === "number" || typeof v.startedAt === "number" || typeof v.remainingMs === "number") {
    const state: LiveRestState = {
      startedAt: typeof v.startedAt === "number" ? v.startedAt : null,
      endAt: typeof v.endAt === "number" ? v.endAt : null,
      pausedAt: typeof v.pausedAt === "number" ? v.pausedAt : null,
      remainingMs: typeof v.remainingMs === "number" ? v.remainingMs : null,
    };
    if (remainingRestMs(state, now) <= 0 && state.pausedAt == null) return emptyLiveRest();
    return state;
  }

  const until = typeof v.until === "number" ? v.until : null;
  const pausedSec =
    typeof v.pausedRemainingSec === "number" ? v.pausedRemainingSec : null;
  if (pausedSec != null && pausedSec > 0) {
    return {
      startedAt: now,
      endAt: now + pausedSec * 1000,
      pausedAt: now,
      remainingMs: pausedSec * 1000,
    };
  }
  if (until != null && until > now) {
    return {
      startedAt: now,
      endAt: until,
      pausedAt: null,
      remainingMs: null,
    };
  }
  return null;
}

export function readLiveRest(sessionId: string): LiveRestState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(liveRestStorageKey(sessionId));
    if (!raw) return null;
    return normalizeLiveRest(JSON.parse(raw), Date.now());
  } catch {
    return null;
  }
}

export function writeLiveRest(sessionId: string, state: LiveRestState) {
  if (typeof window === "undefined") return;
  try {
    if (!state.endAt && !state.remainingMs && !state.pausedAt) {
      sessionStorage.removeItem(liveRestStorageKey(sessionId));
      return;
    }
    sessionStorage.setItem(liveRestStorageKey(sessionId), JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function clearLiveRestStorage(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(liveRestStorageKey(sessionId));
  } catch {
    /* ignore */
  }
}
