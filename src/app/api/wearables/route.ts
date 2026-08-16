import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { ALL_PROVIDER_IDS, HEALTH_PROVIDERS } from "@/lib/health/providers/registry";
import { getProviderAvailabilityList } from "@/lib/health/provider-availability";
import type { WearableProvider } from "@prisma/client";
import { getProviderOAuthUrl } from "@/lib/health/providers/oauth-dispatcher";
import { createWearableOAuthState } from "@/lib/health/oauth-state";

const connectSchema = z.object({
  provider: z.enum(ALL_PROVIDER_IDS as [WearableProvider, ...WearableProvider[]]),
});

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const connections = await prisma.wearableConnection.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    const prefs = await prisma.healthSyncPreference
      .findUnique({ where: { userId: session.user.id } })
      .catch(() => null);

    return jsonOk({
      connections: connections.map((c) => {
        const meta = parseMeta(c.metadata);
        const providerMeta = HEALTH_PROVIDERS.find((p) => p.id === c.provider);
        let syncStatus: string = "connected";
        if (!c.isActive) syncStatus = "disconnected";
        else if (c.lastSyncError) syncStatus = "error";
        else if (meta.status === "oauth_pending") syncStatus = "oauth_pending";
        else if (meta.status === "native_bridge") syncStatus = "native_bridge";

        return {
          id: c.id,
          provider: c.provider,
          isActive: c.isActive,
          lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
          lastSyncError: c.lastSyncError ?? null,
          connectedAt:
            (typeof meta.connectedAt === "string" && meta.connectedAt) ||
            c.createdAt.toISOString(),
          deviceName:
            (typeof meta.deviceName === "string" && meta.deviceName) ||
            providerMeta?.name ||
            c.provider,
          manufacturer: providerMeta?.manufacturer ?? "Unbekannt",
          batteryLevel:
            typeof meta.batteryLevel === "number" ? meta.batteryLevel : null,
          syncStatus,
          metadata: meta,
        };
      }),
      providers: getProviderAvailabilityList(),
      preferences: prefs,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültiger Provider");

    const provider = parsed.data.provider;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/wearables/oauth/${provider.toLowerCase()}/callback`;
    let state: string;
    try {
      state = createWearableOAuthState(session.user.id, provider);
    } catch {
      return jsonError("Server-Konfiguration unvollständig (AUTH_SECRET)", 500);
    }

    const oauthUrl = getProviderOAuthUrl(provider, redirectUri, state);

    if (oauthUrl === null && ["FITBIT", "GOOGLE_FIT", "GARMIN", "POLAR", "COROS", "SUUNTO"].includes(provider)) {
      return jsonError(
        `OAuth nicht konfiguriert — fehlende Client-Credentials für ${provider}`,
        400
      );
    }

    const connectedAt = new Date().toISOString();
    const connection = await prisma.wearableConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider,
        },
      },
      create: {
        userId: session.user.id,
        provider,
        isActive: true,
        metadata: JSON.stringify({
          status: oauthUrl ? "oauth_pending" : "native_bridge",
          connectedAt,
          deviceName: HEALTH_PROVIDERS.find((p) => p.id === provider)?.name,
          manufacturer: HEALTH_PROVIDERS.find((p) => p.id === provider)?.manufacturer,
        }),
      },
      update: {
        isActive: true,
        lastSyncError: null,
        metadata: JSON.stringify({
          status: oauthUrl ? "oauth_pending" : "native_bridge",
          connectedAt,
          deviceName: HEALTH_PROVIDERS.find((p) => p.id === provider)?.name,
          manufacturer: HEALTH_PROVIDERS.find((p) => p.id === provider)?.manufacturer,
        }),
      },
    });

    return jsonOk({
      connection: {
        provider: connection.provider,
        isActive: connection.isActive,
      },
      oauthUrl,
      nativeBridge: !oauthUrl,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
