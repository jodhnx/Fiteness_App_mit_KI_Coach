import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { goalSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ goals });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        targetValue: parsed.data.targetValue,
        unit: parsed.data.unit,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
      },
    });
    return jsonOk({ goal }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const { id, currentValue, completed } = body;
    const goal = await prisma.goal.updateMany({
      where: { id, userId: session.user.id },
      data: { currentValue, completed },
    });
    return jsonOk({ goal });
  } catch (e) {
    return handleApiError(e);
  }
}
