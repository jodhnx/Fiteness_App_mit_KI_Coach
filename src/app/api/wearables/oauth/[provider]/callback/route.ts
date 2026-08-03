import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { WearableProvider } from "@prisma/client";
import {
  exchangeProviderCode,
  providerFromPathParam,
} from "@/lib/health/providers/oauth-dispatcher";
import { getProviderMeta } from "@/lib/health/providers/registry";
import { syncWearableProvider } from "@/lib/health/health-sync-service";
import { verifyWearableOAuthState } from "@/lib/health/oauth-state";

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

    const verified = verifyWearableOAuthState(state, provider);
    if (!verified) {
      return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_state_invalid`);
    }

    const redirectUri = `${baseUrl}/api/wearables/oauth/${providerParam.toLowerCase()}/callback`;
    const tokens = await exchangeProviderCode(provider, code, redirectUri);
    if (!tokens) {
      return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
    }

    await saveTokens(verified.userId, provider, tokens);
    void syncWearableProvider(verified.userId, provider, 7).catch(() => {});

    return NextResponse.redirect(
      `${baseUrl}/geraete?connected=${encodeURIComponent(provider)}`
    );
  } catch {
    return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
  }
}
