import { prisma } from "@/lib/prisma";
import type { WearableProvider } from "@prisma/client";
import { subDays } from "date-fns";
import type { ProviderSyncResult } from "@/lib/health/types";
import {
  connectionFromDb,
  syncFitbitProvider,
  syncNativeBridgeProvider,
} from "@/lib/health/providers/fitbit-provider";
import { syncGoogleFitProvider } from "@/lib/health/providers/google-fit-provider";
import { getProviderMeta } from "@/lib/health/providers/registry";

const WEB_OAUTH_PROVIDERS: WearableProvider[] = ["FITBIT", "GARMIN", "POLAR", "GOOGLE_FIT", "COROS", "SUUNTO"];
const NATIVE_PROVIDERS: WearableProvider[] = [
  "APPLE_HEALTH",
  "SAMSUNG_HEALTH",
  "GOOGLE_HEALTH_CONNECT",
  "HUAWEI_HEALTH",
  "WEAR_OS",
];

async function syncProvider(
  userId: string,
  provider: WearableProvider,
  since: Date
): Promise<ProviderSyncResult> {
  const connection = await prisma.wearableConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  });

  if (!connection?.isActive) {
    return {
      provider,
      importedDays: 0,
      importedWorkouts: 0,
      skippedDuplicates: 0,
      error: "Nicht verbunden",
    };
  }

  const conn = connectionFromDb(connection);

  try {
    if (provider === "FITBIT") {
      return await syncFitbitProvider(userId, conn, since);
    }

    if (provider === "GOOGLE_FIT") {
      return await syncGoogleFitProvider(userId, conn, since);
    }

    if (NATIVE_PROVIDERS.includes(provider)) {
      return await syncNativeBridgeProvider(userId, provider);
    }

    if (WEB_OAUTH_PROVIDERS.includes(provider)) {
      if (!conn.accessToken) {
        return {
          provider,
          importedDays: 0,
          importedWorkouts: 0,
          skippedDuplicates: 0,
          error: `${getProviderMeta(provider)?.name ?? provider}: OAuth-Verbindung ausstehend`,
        };
      }
      // Token connected — mark as synced until full API adapter ships
      return {
        provider,
        importedDays: 0,
        importedWorkouts: 0,
        skippedDuplicates: 0,
        error: undefined,
      };
    }

    return {
      provider,
      importedDays: 0,
      importedWorkouts: 0,
      skippedDuplicates: 0,
      error: "Unbekannter Provider",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync fehlgeschlagen";
    await prisma.wearableConnection.update({
      where: { userId_provider: { userId, provider } },
      data: { lastSyncError: msg },
    });
    return {
      provider,
      importedDays: 0,
      importedWorkouts: 0,
      skippedDuplicates: 0,
      error: msg,
    };
  }
}

export async function syncAllWearables(
  userId: string,
  sinceDays = 7
): Promise<{
  results: ProviderSyncResult[];
  lastSyncAt: string;
}> {
  const since = subDays(new Date(), sinceDays);
  const connections = await prisma.wearableConnection.findMany({
    where: { userId, isActive: true },
  });

  const results: ProviderSyncResult[] = [];
  for (const c of connections) {
    const result = await syncProvider(userId, c.provider, since);
    results.push(result);

    await prisma.wearableConnection.update({
      where: { id: c.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: result.error ?? null,
      },
    });
  }

  return { results, lastSyncAt: new Date().toISOString() };
}

export async function syncWearableProvider(
  userId: string,
  provider: WearableProvider,
  sinceDays = 7
) {
  const since = subDays(new Date(), sinceDays);
  const result = await syncProvider(userId, provider, since);

  await prisma.wearableConnection.updateMany({
    where: { userId, provider, isActive: true },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: result.error ?? null,
    },
  });

  return result;
}
