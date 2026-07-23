import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeFitbitCode } from "@/lib/health/providers/fitbit-provider";
import { exchangeGoogleFitCode } from "@/lib/health/providers/google-fit-provider";
import type { WearableProvider } from "@prisma/client";

type RouteParams = { params: Promise<{ provider: string }> };

async function saveTokens(
  userId: string,
  provider: WearableProvider,
  tokens: { accessToken: string; refreshToken?: string; expiresAt?: number }
) {
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
        expiresAt: tokens.expiresAt,
      }),
    },
    update: {
      isActive: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      lastSyncError: null,
      metadata: JSON.stringify({
        status: "connected",
        expiresAt: tokens.expiresAt,
      }),
    },
  });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { provider } = await params;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_cancelled`);
  }

  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as {
      userId: string;
      provider: string;
    };

    if (provider === "fitbit") {
      const redirectUri = `${baseUrl}/api/wearables/oauth/fitbit/callback`;
      const tokens = await exchangeFitbitCode(code, redirectUri);
      if (!tokens) {
        return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
      }
      await saveTokens(decoded.userId, "FITBIT", tokens);
    } else if (provider === "google_fit") {
      const redirectUri = `${baseUrl}/api/wearables/oauth/google_fit/callback`;
      const tokens = await exchangeGoogleFitCode(code, redirectUri);
      if (!tokens) {
        return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
      }
      await saveTokens(decoded.userId, "GOOGLE_FIT", tokens);
    }

    return NextResponse.redirect(`${baseUrl}/geraete?connected=${provider}`);
  } catch {
    return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
  }
}
