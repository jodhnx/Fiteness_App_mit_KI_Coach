import type { ProviderConnection } from "@/lib/health/providers/base-provider";
import type { HealthDaySnapshot, ProviderSyncResult } from "@/lib/health/types";
import { applyHealthDaySnapshot } from "@/lib/health/health-merge-service";
import { subDays } from "date-fns";

const GOOGLE_FIT = "https://www.googleapis.com/fitness/v1";

export function getGoogleFitOAuthUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: [
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.heart_rate.read",
      "https://www.googleapis.com/auth/fitness.sleep.read",
      "https://www.googleapis.com/auth/fitness.body.read",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleFitCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number } | null> {
  const clientId = process.env.GOOGLE_FIT_CLIENT_ID || process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.GOOGLE_FIT_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
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

async function fitGet<T>(token: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(`${GOOGLE_FIT}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function syncGoogleFitProvider(
  userId: string,
  connection: ProviderConnection,
  since: Date
): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    provider: "GOOGLE_FIT",
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
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);
    const dateStr = dayStart.toISOString().slice(0, 10);

    const dataset = await fitGet<{
      bucket?: { dataset?: { point?: { value?: { intVal?: number; fpVal?: number }[] }[] }[] }[];
    }>(connection.accessToken, "/users/me/dataset:aggregate", {
      aggregateBy: [
        { dataTypeName: "com.google.step_count.delta" },
        { dataTypeName: "com.google.calories.expended" },
        { dataTypeName: "com.google.distance.delta" },
        { dataTypeName: "com.google.heart_rate.bpm" },
      ],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: dayStart.getTime(),
      endTimeMillis: dayEnd.getTime(),
    });

    const buckets = dataset?.bucket ?? [];
    let steps = 0;
    let calories = 0;
    let distanceM = 0;
    let hrSum = 0;
    let hrCount = 0;

    for (const b of buckets) {
      for (const ds of b.dataset ?? []) {
        for (const p of ds.point ?? []) {
          const v = p.value?.[0];
          if (v?.intVal != null) steps += v.intVal;
          if (v?.fpVal != null) {
            if (v.fpVal > 30 && v.fpVal < 220) {
              hrSum += v.fpVal;
              hrCount++;
            } else if (v.fpVal > 220) {
              calories += v.fpVal;
            } else {
              distanceM += v.fpVal;
            }
          }
        }
      }
    }

    const snapshot: HealthDaySnapshot = {
      date: dateStr,
      steps: steps > 0 ? steps : undefined,
      caloriesBurned: calories > 0 ? Math.round(calories) : undefined,
      distanceM: distanceM > 0 ? distanceM : undefined,
      avgHeartRate: hrCount > 0 ? Math.round(hrSum / hrCount) : undefined,
    };

    const { applied, duplicate } = await applyHealthDaySnapshot(
      userId,
      "GOOGLE_FIT",
      snapshot
    );
    if (applied) result.importedDays++;
    if (duplicate) result.skippedDuplicates++;
  }

  return result;
}
