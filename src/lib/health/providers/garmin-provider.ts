import { subDays } from "date-fns";
import type { ProviderConnection } from "@/lib/health/providers/base-provider";
import type { HealthDaySnapshot, ProviderSyncResult } from "@/lib/health/types";
import {
  applyHealthDaySnapshot,
  applyWearableWorkout,
} from "@/lib/health/health-merge-service";

const AUTH = "https://connect.garmin.com/oauth2Confirm";
const TOKEN = "https://connectapi.garmin.com/di-oauth2-service/oauth/token";
const API = "https://apis.garmin.com/wellness-api/rest";

export function getGarminOAuthUrl(redirectUri: string, state: string): string | null {
  const clientId = process.env.GARMIN_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH}?${params}`;
}

export async function exchangeGarminCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number } | null> {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
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

async function garminGet<T>(token: string, path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

export async function syncGarminProvider(
  userId: string,
  connection: ProviderConnection,
  since: Date
): Promise<ProviderSyncResult> {
  const result: ProviderSyncResult = {
    provider: "GARMIN",
    importedDays: 0,
    importedWorkouts: 0,
    skippedDuplicates: 0,
  };

  if (!connection.accessToken) {
    result.error = "Kein Access-Token — bitte erneut verbinden";
    return result;
  }

  const days = Math.min(7, Math.ceil((Date.now() - since.getTime()) / 86400000));
  let anyOk = false;

  for (let i = 0; i < days; i++) {
    const d = subDays(new Date(), i);
    const dateStr = d.toISOString().slice(0, 10);
    const uploadStart = Math.floor(d.setHours(0, 0, 0, 0) / 1000);
    const uploadEnd = uploadStart + 86400;

    const dailies = await garminGet<
      {
        calendarDate?: string;
        steps?: number;
        distanceInMeters?: number;
        activeTimeInSeconds?: number;
        activeKilocalories?: number;
        restingHeartRateInBeatsPerMinute?: number;
        averageHeartRateInBeatsPerMinute?: number;
        maxHeartRateInBeatsPerMinute?: number;
      }[]
    >(
      connection.accessToken,
      `/dailies?uploadStartTimeInSeconds=${uploadStart}&uploadEndTimeInSeconds=${uploadEnd}`
    );

    if (dailies) anyOk = true;
    const day = dailies?.[0];
    if (!day) continue;

    const snapshot: HealthDaySnapshot = {
      date: day.calendarDate ?? dateStr,
      steps: day.steps,
      distanceM: day.distanceInMeters,
      activeMinutes: day.activeTimeInSeconds
        ? Math.round(day.activeTimeInSeconds / 60)
        : undefined,
      caloriesBurned: day.activeKilocalories,
      activeCalories: day.activeKilocalories,
      restingHeartRate: day.restingHeartRateInBeatsPerMinute,
      avgHeartRate: day.averageHeartRateInBeatsPerMinute,
      maxHeartRate: day.maxHeartRateInBeatsPerMinute,
    };

    const { applied, duplicate } = await applyHealthDaySnapshot(
      userId,
      "GARMIN",
      snapshot
    );
    if (applied) result.importedDays++;
    if (duplicate) result.skippedDuplicates++;
  }

  const activities = await garminGet<
    {
      summaryId?: string;
      activityType?: string;
      startTimeInSeconds?: number;
      durationInSeconds?: number;
      distanceInMeters?: number;
      activeKilocalories?: number;
      averageHeartRateInBeatsPerMinute?: number;
      maxHeartRateInBeatsPerMinute?: number;
    }[]
  >(
    connection.accessToken,
    `/activities?uploadStartTimeInSeconds=${Math.floor(since.getTime() / 1000)}&uploadEndTimeInSeconds=${Math.floor(Date.now() / 1000)}`
  );

  if (activities) anyOk = true;
  for (const a of activities ?? []) {
    if (!a.summaryId || !a.startTimeInSeconds) continue;
    const { applied, duplicate } = await applyWearableWorkout(userId, "GARMIN", {
      externalId: a.summaryId,
      type: a.activityType ?? "Workout",
      startedAt: new Date(a.startTimeInSeconds * 1000).toISOString(),
      durationSec: a.durationInSeconds ?? 0,
      distanceM: a.distanceInMeters,
      caloriesBurned: a.activeKilocalories,
      avgHeartRate: a.averageHeartRateInBeatsPerMinute,
      maxHeartRate: a.maxHeartRateInBeatsPerMinute,
    });
    if (applied) result.importedWorkouts++;
    if (duplicate) result.skippedDuplicates++;
  }

  if (!anyOk) {
    result.error =
      "Garmin API nicht erreichbar — Partner-Zugang prüfen (GARMIN_CLIENT_ID) oder später erneut synchronisieren";
  }

  return result;
}
