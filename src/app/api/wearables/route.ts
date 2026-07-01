import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { ALL_PROVIDER_IDS, HEALTH_PROVIDERS } from "@/lib/health/providers/registry";
import type { WearableProvider } from "@prisma/client";
import { getFitbitOAuthUrl } from "@/lib/health/providers/fitbit-provider";

const connectSchema = z.object({
  provider: z.enum(ALL_PROVIDER_IDS as [WearableProvider, ...WearableProvider[]]),
});

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
      connections: connections.map((c) => ({
        id: c.id,
        provider: c.provider,
        isActive: c.isActive,
        lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
        lastSyncError: c.lastSyncError ?? null,
        metadata: c.metadata ? JSON.parse(c.metadata) : null,
      })),
      providers: HEALTH_PROVIDERS,
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
    const state = Buffer.from(
      JSON.stringify({ userId: session.user.id, provider })
    ).toString("base64url");

    let oauthUrl: string | null = null;
    if (provider === "FITBIT") {
      oauthUrl = getFitbitOAuthUrl(redirectUri, state);
    }

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
          connectedAt: new Date().toISOString(),
        }),
      },
      update: {
        isActive: true,
        lastSyncError: null,
        metadata: JSON.stringify({
          status: oauthUrl ? "oauth_pending" : "native_bridge",
          connectedAt: new Date().toISOString(),
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
