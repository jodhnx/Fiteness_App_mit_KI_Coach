import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

const schema = z.object({
  name: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const templates = await prisma.workoutTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk({ templates });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const template = await prisma.workoutTemplate.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        payload: parsed.data.payload as object,
      },
    });
    return jsonOk({ template }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return jsonError("id fehlt");
    await prisma.workoutTemplate.deleteMany({
      where: { id, userId: session.user.id },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
