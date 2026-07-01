import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { ALL_PROVIDER_IDS } from "@/lib/health/providers/registry";
import type { WearableProvider } from "@prisma/client";

const schema = z.object({
  provider: z.enum(ALL_PROVIDER_IDS as [WearableProvider, ...WearableProvider[]]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültiger Provider");

    await prisma.wearableConnection.updateMany({
      where: { userId: session.user.id, provider: parsed.data.provider },
      data: { isActive: false, accessToken: null, refreshToken: null },
    });

    return jsonOk({ disconnected: true, provider: parsed.data.provider });
  } catch (e) {
    return handleApiError(e);
  }
}
