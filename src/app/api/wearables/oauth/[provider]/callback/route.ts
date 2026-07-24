import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WearableProvider } from "@prisma/client";
import {
  exchangeProviderCode,
  providerFromPathParam,
} from "@/lib/health/providers/oauth-dispatcher";
import { getProviderMeta } from "@/lib/health/providers/registry";
import { syncWearableProvider } from "@/lib/health/health-sync-service";

type RouteParams = { params: Promise<{ provider: string }> };

async function saveTokens(
  userId: string,
  provider: WearableProvider,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
    extra?: Record<string, unknown>;
  }
) {
  const meta = getProviderMeta(provider);
  await prisma.wearableConnection.upsert({
    where: { userId_provider: { userId, provider } },
    create: {
      userId,
      provider,
      isActive: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      metadata: JSON.stringify({
        status: "connected",
        connectedAt: new Date().toISOString(),
        expiresAt: tokens.expiresAt,
        deviceName: meta?.name,
        manufacturer: meta?.manufacturer,
        ...tokens.extra,
      }),
    },
    update: {
      isActive: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      lastSyncError: null,
      metadata: JSON.stringify({
        status: "connected",
        connectedAt: new Date().toISOString(),
        expiresAt: tokens.expiresAt,
        deviceName: meta?.name,
        manufacturer: meta?.manufacturer,
        ...tokens.extra,
      }),
    },
  });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { provider: providerParam } = await params;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_cancelled`);
  }

  try {
    const provider = providerFromPathParam(providerParam);
    if (!provider) {
      return NextResponse.redirect(`${baseUrl}/geraete?error=unknown_provider`);
    }

    const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as {
      userId: string;
      provider: string;
    };

    const redirectUri = `${baseUrl}/api/wearables/oauth/${providerParam.toLowerCase()}/callback`;
    const tokens = await exchangeProviderCode(provider, code, redirectUri);
    if (!tokens) {
      return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
    }

    await saveTokens(decoded.userId, provider, tokens);

    // Kick off first sync in background (don't block redirect)
    void syncWearableProvider(decoded.userId, provider, 7).catch(() => {});

    return NextResponse.redirect(
      `${baseUrl}/geraete?connected=${encodeURIComponent(provider)}`
    );
  } catch {
    return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
  }
}
