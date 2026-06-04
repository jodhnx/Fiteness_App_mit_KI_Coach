import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

const connectSchema = z.object({
  provider: z.enum(["FITBIT", "GARMIN", "APPLE_HEALTH", "SAMSUNG_HEALTH"]),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const connections = await prisma.wearableConnection.findMany({
      where: { userId: session.user.id },
    });
    return jsonOk({
      connections,
      providers: ["FITBIT", "GARMIN", "APPLE_HEALTH", "SAMSUNG_HEALTH"],
      note: "OAuth-Integration vorbereitet – Verbindung über Provider-API in Produktion",
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

    const connection = await prisma.wearableConnection.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: parsed.data.provider,
        },
      },
      create: {
        userId: session.user.id,
        provider: parsed.data.provider,
        isActive: true,
        metadata: JSON.stringify({ status: "pending_oauth" }),
      },
      update: { isActive: true, lastSyncAt: new Date() },
    });

    return jsonOk({
      connection,
      oauthUrl: `/api/wearables/oauth/${parsed.data.provider.toLowerCase()}`,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
