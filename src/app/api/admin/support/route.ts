import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";
import type { SupportRequestStatus } from "@prisma/client";

const statusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return jsonError("Keine Berechtigung", 403);
    }

    const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
    const status = req.nextUrl.searchParams.get("status") as SupportRequestStatus | null;

    const where = {
      ...(status && ["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status)
        ? { status }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { message: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [requests, counts] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.supportRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };
    for (const row of counts) {
      statusCounts[row.status] = row._count._all;
    }

    return jsonOk({ requests, statusCounts });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return jsonError("Keine Berechtigung", 403);
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return jsonError("ID fehlt");

    const body = await req.json();
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültiger Status");

    const updated = await prisma.supportRequest.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return jsonOk({ request: updated });
  } catch (e) {
    return handleApiError(e);
  }
}
