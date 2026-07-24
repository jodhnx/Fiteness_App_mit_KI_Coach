import type { ProviderConnection } from "@/lib/health/providers/base-provider";
import type { ProviderSyncResult } from "@/lib/health/types";
import { applyWearableWorkout } from "@/lib/health/health-merge-service";

const AUTH = "https://cloudapi-oauth.suunto.com/oauth/authorize";
const TOKEN = "https://cloudapi-oauth.suunto.com/oauth/token";
const API = "https://cloudapi.suunto.com";

export function getSuuntoOAuthUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.SUUNTO_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH}?${params}`;
}

export async function exchangeSuuntoCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number } | null> {
  const clientId = process.env.SUUNTO_CLIENT_ID;
  const clientSecret = process.env.SUUNTO_CLIENT_SECRET;
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
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
  };
}

export async function syncSuuntoProvider(
  userId: string,
  connection: ProviderConnection,
  _since: Date
): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    provider: "SUUNTO",
    importedDays: 0,
    importedWorkouts: 0,
    skippedDuplicates: 0,
  };

  if (!connection.accessToken) {
    result.error = "Kein Access-Token — bitte erneut verbinden";
    return result;
  }

  const res = await fetch(`${API}/v2/workouts?limit=20`, {
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.SUUNTO_SUBSCRIPTION_KEY ?? "",
    },
  });

  if (!res.ok) {
    result.error = "Suunto API nicht erreichbar — Zugangsdaten prüfen";
    return result;
  }

  const data = (await res.json()) as {
    payload?: {
      workoutKey?: string;
      activityId?: number;
      startTime?: number;
      totalTime?: number;
      totalDistance?: number;
      energyConsumption?: number;
      hrdata?: { avg?: number; max?: number };
    }[];
  };

  for (const w of data.payload ?? []) {
    if (!w.workoutKey || !w.startTime) continue;
    const { applied, duplicate } = await applyWearableWorkout(userId, "SUUNTO", {
      externalId: w.workoutKey,
      type: w.activityId ? `Activity ${w.activityId}` : "Workout",
      startedAt: new Date(w.startTime).toISOString(),
      durationSec: Math.round(w.totalTime ?? 0),
      distanceM: w.totalDistance,
      caloriesBurned: w.energyConsumption,
      avgHeartRate: w.hrdata?.avg,
      maxHeartRate: w.hrdata?.max,
    });
    if (applied) result.importedWorkouts++;
    if (duplicate) result.skippedDuplicates++;
  }

  return result;
}
