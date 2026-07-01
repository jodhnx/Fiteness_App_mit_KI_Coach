import type { WearableProvider } from "@prisma/client";
import { subDays } from "date-fns";
import type { HealthDaySnapshot, ProviderSyncResult } from "@/lib/health/types";
import type { ProviderConnection } from "@/lib/health/providers/base-provider";
import {
  applyHealthDaySnapshot,
  applyWearableWorkout,
} from "@/lib/health/health-merge-service";

const FITBIT_API = "https://api.fitbit.com/1";

function parseConnectionMeta(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fitbitFetch<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`${FITBIT_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function syncFitbitProvider(
  userId: string,
  connection: ProviderConnection,
  since: Date
): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    provider: "FITBIT",
    importedDays: 0,
    importedWorkouts: 0,
    skippedDuplicates: 0,
  };

  if (!connection.accessToken) {
    result.error = "Kein Access-Token — bitte erneut verbinden";
    return result;
  }

  const days = Math.min(14, Math.ceil((Date.now() - since.getTime()) / 86400000));
  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), i);
    const dateStr = d.toISOString().slice(0, 10);

    const [stepsData, sleepData, hrData] = await Promise.all([
      fitbitFetch<{ "activities-steps": { value: string }[] }>(
        connection.accessToken,
        `/user/-/activities/steps/date/${dateStr}/1d.json`
      ),
      fitbitFetch<{
        sleep?: { minutesAsleep?: number; levels?: { summary?: Record<string, { minutes?: number }> } }[];
      }>(connection.accessToken, `/user/-/sleep/date/${dateStr}.json`),
      fitbitFetch<{ "activities-heart"?: { value?: { restingHeartRate?: number } }[] }>(
        connection.accessToken,
        `/user/-/activities/heart/date/${dateStr}/1d.json`
      ),
    ]);

    const steps = Number(stepsData?.["activities-steps"]?.[0]?.value ?? 0);
    const sleepMin = sleepData?.sleep?.[0]?.minutesAsleep ?? 0;
    const levels = sleepData?.sleep?.[0]?.levels?.summary;
    const restingHr = hrData?.["activities-heart"]?.[0]?.value?.restingHeartRate;

    const snapshot: HealthDaySnapshot = {
      date: dateStr,
      steps: steps > 0 ? steps : undefined,
      sleepHours: sleepMin > 0 ? sleepMin / 60 : undefined,
      sleepDeepHours: levels?.deep?.minutes ? levels.deep.minutes / 60 : undefined,
      sleepRemHours: levels?.rem?.minutes ? levels.rem.minutes / 60 : undefined,
      sleepLightHours: levels?.light?.minutes ? levels.light.minutes / 60 : undefined,
      restingHeartRate: restingHr,
    };

    const { applied, duplicate } = await applyHealthDaySnapshot(userId, "FITBIT", snapshot);
    if (applied) result.importedDays++;
    if (duplicate) result.skippedDuplicates++;
  }

  type FitbitLog = {
    activities?: {
      logId: number;
      activityName: string;
      startTime: string;
      duration: number;
      distance?: number;
      calories?: number;
      averageHeartRate?: number;
    }[];
  };

  const afterDate = since.toISOString().slice(0, 10);
  const logs = await fitbitFetch<FitbitLog>(
    connection.accessToken,
    `/user/-/activities/list.json?afterDate=${afterDate}&sort=desc&limit=20`
  );

  for (const a of logs?.activities ?? []) {
    const { applied, duplicate } = await applyWearableWorkout(userId, "FITBIT", {
      externalId: String(a.logId),
      type: a.activityName,
      startedAt: new Date(`${afterDate}T${a.startTime}`).toISOString(),
      durationSec: Math.round(a.duration / 1000),
      distanceM: a.distance ? a.distance * 1000 : undefined,
      caloriesBurned: a.calories,
      avgHeartRate: a.averageHeartRate,
    });
    if (applied) result.importedWorkouts++;
    if (duplicate) result.skippedDuplicates++;
  }

  return result;
}

export function getFitbitOAuthUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.FITBIT_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "activity heartrate sleep weight profile",
    state,
  });
  return `https://www.fitbit.com/oauth2/authorize?${params}`;
}

export async function exchangeFitbitCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number } | null> {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
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

export async function syncNativeBridgeProvider(
  userId: string,
  provider: WearableProvider
): Promise<ProviderSyncResult> {
  return {
    provider,
    importedDays: 0,
    importedWorkouts: 0,
    skippedDuplicates: 0,
    error:
      "Native Bridge aktiv — Daten werden über die mobile App / Health Connect synchronisiert. Öffne NEXFORM auf deinem Gerät.",
  };
}

export function connectionFromDb(row: {
  accessToken: string | null;
  refreshToken: string | null;
  metadata: string | null;
}): ProviderConnection {
  return {
    accessToken: row.accessToken,
    refreshToken: row.refreshToken,
    metadata: parseConnectionMeta(row.metadata),
  };
}
