import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeFitbitCode } from "@/lib/health/providers/fitbit-provider";

type RouteParams = { params: Promise<{ provider: string }> };

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

      await prisma.wearableConnection.upsert({
        where: {
          userId_provider: {
            userId: decoded.userId,
            provider: "FITBIT",
          },
        },
        create: {
          userId: decoded.userId,
          provider: "FITBIT",
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

    return NextResponse.redirect(`${baseUrl}/geraete?connected=${provider}`);
  } catch {
    return NextResponse.redirect(`${baseUrl}/geraete?error=oauth_failed`);
  }
}
