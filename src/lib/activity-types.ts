import type { EnduranceActivityType } from "@prisma/client";

export const ACTIVITY_TYPE_ORDER: EnduranceActivityType[] = [
  "RUNNING",
  "JOGGING",
  "WALKING",
  "HIKING",
  "CYCLING",
  "SWIMMING",
  "ROWING",
  "OTHER",
];

export const ACTIVITY_LABELS: Record<EnduranceActivityType, string> = {
  RUNNING: "Laufen",
  JOGGING: "Joggen",
  CYCLING: "Radfahren",
  HIKING: "Wandern",
  WALKING: "Gehen",
  SWIMMING: "Schwimmen",
  ROWING: "Rudern",
  OTHER: "Sonstige",
};

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

export function formatDistance(m: number | null | undefined): string {
  if (m == null || m <= 0) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || secPerKm <= 0) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}
