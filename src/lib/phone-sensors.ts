/** Client-side phone sensor fallback when no smartwatch is connected. */

const CONSENT_KEY = "nexform:phone-sensors-consent";
const STEPS_KEY = "nexform:phone-steps-today";
const GPS_SESSION_KEY = "nexform:gps-session";

export type PhoneSensorConsent = {
  steps: boolean;
  motion: boolean;
  gps: boolean;
  grantedAt: string;
};

export type PhoneStepsState = {
  date: string;
  steps: number;
  source: "pedometer" | "estimated" | "manual";
  lastSyncAt: string | null;
};

export type GpsPoint = { lat: number; lng: number; t: number };

export type GpsSession = {
  id: string;
  startedAt: string;
  points: GpsPoint[];
  distanceM: number;
  type: "WALKING" | "RUNNING";
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getPhoneSensorConsent(): PhoneSensorConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as PhoneSensorConsent) : null;
  } catch {
    return null;
  }
}

export function setPhoneSensorConsent(consent: Omit<PhoneSensorConsent, "grantedAt">) {
  const value: PhoneSensorConsent = { ...consent, grantedAt: new Date().toISOString() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  return value;
}

export function clearPhoneSensorConsent() {
  localStorage.removeItem(CONSENT_KEY);
}

export function getPhoneStepsToday(): PhoneStepsState {
  const date = todayKey();
  try {
    const raw = localStorage.getItem(STEPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PhoneStepsState;
      if (parsed.date === date) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { date, steps: 0, source: "estimated", lastSyncAt: null };
}

export function setPhoneStepsToday(steps: number, source: PhoneStepsState["source"]) {
  const state: PhoneStepsState = {
    date: todayKey(),
    steps: Math.max(0, Math.round(steps)),
    source,
    lastSyncAt: null,
  };
  localStorage.setItem(STEPS_KEY, JSON.stringify(state));
  return state;
}

export function markPhoneStepsSynced(steps: number) {
  const state = getPhoneStepsToday();
  const next: PhoneStepsState = {
    ...state,
    steps: Math.max(state.steps, steps),
    lastSyncAt: new Date().toISOString(),
  };
  localStorage.setItem(STEPS_KEY, JSON.stringify(next));
  return next;
}

/** Haversine distance in meters between two GPS points. */
export function haversineM(a: GpsPoint, b: GpsPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function getGpsSession(): GpsSession | null {
  try {
    const raw = localStorage.getItem(GPS_SESSION_KEY);
    return raw ? (JSON.parse(raw) as GpsSession) : null;
  } catch {
    return null;
  }
}

export function startGpsSession(type: "WALKING" | "RUNNING" = "WALKING"): GpsSession {
  const session: GpsSession = {
    id: `gps-${Date.now()}`,
    startedAt: new Date().toISOString(),
    points: [],
    distanceM: 0,
    type,
  };
  localStorage.setItem(GPS_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function updateGpsSession(point: GpsPoint): GpsSession | null {
  const session = getGpsSession();
  if (!session) return null;
  const last = session.points[session.points.length - 1];
  if (last) {
    const d = haversineM(last, point);
    if (d < 2 || d > 100) {
      /* ignore GPS jitter / teleport */
    } else {
      session.distanceM += d;
    }
  }
  session.points.push(point);
  if (session.points.length > 500) session.points = session.points.slice(-400);
  localStorage.setItem(GPS_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearGpsSession() {
  localStorage.removeItem(GPS_SESSION_KEY);
}

export function estimateCaloriesFromSteps(steps: number, weightKg = 70): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

export function estimateCaloriesFromDistance(distanceM: number, weightKg = 70): number {
  const km = distanceM / 1000;
  return Math.round(km * weightKg * 0.9);
}

export function estimateSpeedKmh(distanceM: number, durationSec: number): number {
  if (durationSec <= 0) return 0;
  return Math.round((distanceM / 1000 / (durationSec / 3600)) * 10) / 10;
}

/** Detect Pedometer Sensor API availability (Chrome Android / some browsers). */
export function canUsePedometer(): boolean {
  return typeof window !== "undefined" && "Pedometer" in window;
}

export function canUseGeolocation(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function canUseDeviceMotion(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}
