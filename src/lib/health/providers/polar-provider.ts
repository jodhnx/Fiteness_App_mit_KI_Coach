import { subDays } from "date-fns";
import type { ProviderConnection } from "@/lib/health/providers/base-provider";
import type { HealthDaySnapshot, ProviderSyncResult } from "@/lib/health/types";
import {
  applyHealthDaySnapshot,
  applyWearableWorkout,
} from "@/lib/health/health-merge-service";

const AUTH = "https://flow.polar.com/oauth2/authorization";
const TOKEN = "https://polarremote.com/v2/oauth2/token";
const API = "https://www.polaraccesslink.com/v3";

export function getPolarOAuthUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.POLAR_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "accesslink.read_all",
    state,
  });
  return `${AUTH}?${params}`;
}

export async function exchangePolarCode(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  extra?: Record<string, unknown>;
} | null> {
  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    x_user_id?: number;
    expires_in?: number;
  };

  // Register user in AccessLink (idempotent)
  if (data.x_user_id) {
    await fetch(`${API}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "member-id": String(data.x_user_id) }),
    }).catch(() => {});
  }

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    extra: { polarUserId: data.x_user_id },
  };
}

async function polarGet<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function syncPolarProvider(
  userId: string,
  connection: ProviderConnection,
  since: Date
): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    provider: "POLAR",
    importedDays: 0,
    importedWorkouts: 0,
    skippedDuplicates: 0,
  };

  if (!connection.accessToken) {
    result.error = "Kein Access-Token — bitte erneut verbinden";
    return result;
  }

  const days = Math.min(7, Math.ceil((Date.now() - since.getTime()) / 86400000));

  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), i);
    const dateStr = d.toISOString().slice(0, 10);

    const activity = await polarGet<{
      active_steps?: number;
      active_calories?: number;
      calories?: number;
      distance?: number;
      duration?: string;
      heart_rate?: { average?: number; maximum?: number };
    }>(connection.accessToken, `/users/activity-transactions`);

    // Prefer daily activity samples if available
    const daily = await polarGet<{
      steps?: number;
      active_calories?: number;
      calories?: number;
      distance?: number;
      duration?: string;
    }>(connection.accessToken, `/users/activities?date=${dateStr}`);

    const steps = daily?.steps ?? activity?.active_steps;
    const calories = daily?.active_calories ?? daily?.calories ?? activity?.calories;
    const distanceM = daily?.distance ?? activity?.distance;

    if (steps || calories || distanceM) {
      const snapshot: HealthDaySnapshot = {
        date: dateStr,
        steps: steps ?? undefined,
        caloriesBurned: calories ? Math.round(calories) : undefined,
        activeCalories: calories ? Math.round(calories) : undefined,
        distanceM: distanceM ?? undefined,
        avgHeartRate: activity?.heart_rate?.average,
        maxHeartRate: activity?.heart_rate?.maximum,
      };
      const { applied, duplicate } = await applyHealthDaySnapshot(
        userId,
        "POLAR",
        snapshot
      );
      if (applied) result.importedDays++;
      if (duplicate) result.skippedDuplicates++;
    }

    const sleep = await polarGet<{
      sleep?: {
        date?: string;
        sleep_start_time?: string;
        sleep_end_time?: string;
        deep_sleep?: number;
        rem_sleep?: number;
        light_sleep?: number;
      }[];
    }>(connection.accessToken, `/users/sleep?from=${dateStr}&to=${dateStr}`);

    const s = sleep?.sleep?.[0];
    if (s) {
      const deepH = s.deep_sleep ? s.deep_sleep / 3600 : undefined;
      const remH = s.rem_sleep ? s.rem_sleep / 3600 : undefined;
      const lightH = s.light_sleep ? s.light_sleep / 3600 : undefined;
      const total =
        (deepH ?? 0) + (remH ?? 0) + (lightH ?? 0) || undefined;
      const { applied } = await applyHealthDaySnapshot(userId, "POLAR", {
        date: s.date ?? dateStr,
        sleepHours: total,
        sleepDeepHours: deepH,
        sleepRemHours: remH,
        sleepLightHours: lightH,
        sleepBedtime: s.sleep_start_time,
        sleepWakeTime: s.sleep_end_time,
      });
      if (applied) result.importedDays++;
    }
  }

  const exercises = await polarGet<{
    exercises?: {
      id: string;
      sport?: string;
      start_time?: string;
      duration?: string;
      distance?: number;
      calories?: number;
      heart_rate?: { average?: number; maximum?: number };
    }[];
  }>(connection.accessToken, `/exercises`);

  for (const ex of exercises?.exercises ?? []) {
    if (!ex.id || !ex.start_time) continue;
    const durationSec = parsePolarDuration(ex.duration);
    const { applied, duplicate } = await applyWearableWorkout(userId, "POLAR", {
      externalId: String(ex.id),
      type: ex.sport ?? "Training",
      startedAt: ex.start_time,
      durationSec,
      distanceM: ex.distance,
      caloriesBurned: ex.calories,
      avgHeartRate: ex.heart_rate?.average,
      maxHeartRate: ex.heart_rate?.maximum,
    });
    if (applied) result.importedWorkouts++;
    if (duplicate) result.skippedDuplicates++;
  }

  return result;
}

function parsePolarDuration(iso?: string): number {
  if (!iso) return 0;
  // PT1H23M45S
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (
    Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  );
}
