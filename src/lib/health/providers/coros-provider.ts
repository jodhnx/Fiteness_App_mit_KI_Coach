import { subDays } from "date-fns";
import type { ProviderConnection } from "@/lib/health/providers/base-provider";
import type { HealthDaySnapshot, ProviderSyncResult } from "@/lib/health/types";
import {
  applyHealthDaySnapshot,
  applyWearableWorkout,
} from "@/lib/health/health-merge-service";

const AUTH = "https://open.coros.com/oauth2/authorize";
const TOKEN = "https://open.coros.com/oauth2/token";
const API = "https://open.coros.com";

export function getCorosOAuthUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.COROS_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH}?${params}`;
}

export async function exchangeCorosCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number } | null> {
  const clientId = process.env.COROS_CLIENT_ID;
  const clientSecret = process.env.COROS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token?: string;
    data?: { access_token?: string; refresh_token?: string; expires_in?: number };
    refresh_token?: string;
    expires_in?: number;
  };
  const accessToken = data.access_token ?? data.data?.access_token;
  if (!accessToken) return null;
  const refresh = data.refresh_token ?? data.data?.refresh_token;
  const expiresIn = data.expires_in ?? data.data?.expires_in;
  return {
    accessToken,
    refreshToken: refresh,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  };
}

async function corosGet<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function syncCorosProvider(
  userId: string,
  connection: ProviderConnection,
  since: Date
): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    provider: "COROS",
    importedDays: 0,
    importedWorkouts: 0,
    skippedDuplicates: 0,
  };

  if (!connection.accessToken) {
    result.error = "Kein Access-Token — bitte erneut verbinden";
    return result;
  }

  const days = Math.min(7, Math.ceil((Date.now() - since.getTime()) / 86400000));
  let reached = false;

  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), i);
    const dateStr = d.toISOString().slice(0, 10);

    const daily = await corosGet<{
      data?: {
        step?: number;
        distance?: number;
        calorie?: number;
        sportTime?: number;
        avgHr?: number;
        maxHr?: number;
      };
    }>(connection.accessToken, `/coros/daily?date=${dateStr}`);

    if (daily) reached = true;
    const row = daily?.data;
    if (!row) continue;

    const snapshot: HealthDaySnapshot = {
      date: dateStr,
      steps: row.step,
      distanceM: row.distance,
      caloriesBurned: row.calorie,
      activeMinutes: row.sportTime,
      avgHeartRate: row.avgHr,
      maxHeartRate: row.maxHr,
    };

    const { applied, duplicate } = await applyHealthDaySnapshot(
      userId,
      "COROS",
      snapshot
    );
    if (applied) result.importedDays++;
    if (duplicate) result.skippedDuplicates++;
  }

  const workouts = await corosGet<{
    data?: {
      list?: {
        workoutId?: string;
        sportMode?: string;
        startTime?: number;
        duration?: number;
        distance?: number;
        calorie?: number;
        avgHr?: number;
        maxHr?: number;
      }[];
    };
  }>(
    connection.accessToken,
    `/coros/sport/list?startDate=${since.toISOString().slice(0, 10)}&endDate=${new Date().toISOString().slice(0, 10)}`
  );

  if (workouts) reached = true;
  for (const w of workouts?.data?.list ?? []) {
    if (!w.workoutId || !w.startTime) continue;
    const { applied, duplicate } = await applyWearableWorkout(userId, "COROS", {
      externalId: String(w.workoutId),
      type: w.sportMode ?? "Workout",
      startedAt: new Date(w.startTime * 1000).toISOString(),
      durationSec: w.duration ?? 0,
      distanceM: w.distance,
      caloriesBurned: w.calorie,
      avgHeartRate: w.avgHr,
      maxHeartRate: w.maxHr,
    });
    if (applied) result.importedWorkouts++;
    if (duplicate) result.skippedDuplicates++;
  }

  if (!reached) {
    result.error =
      "COROS API nicht erreichbar — COROS_CLIENT_ID/SECRET und Partner-Zugang prüfen";
  }

  return result;
}
