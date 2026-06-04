import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({ exerciseLibraryId: z.string() });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const fav = await prisma.favoriteExercise.upsert({
      where: {
        userId_exerciseLibraryId: {
          userId: session.user.id,
          exerciseLibraryId: parsed.data.exerciseLibraryId,
        },
      },
      create: {
        userId: session.user.id,
        exerciseLibraryId: parsed.data.exerciseLibraryId,
      },
      update: {},
    });
    return jsonOk({ favorite: fav }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const id = req.nextUrl.searchParams.get("exerciseLibraryId");
    if (!id) return jsonError("exerciseLibraryId fehlt");
    await prisma.favoriteExercise.deleteMany({
      where: { userId: session.user.id, exerciseLibraryId: id },
    });
    return jsonOk({ success: true });
  } catch (e) {
    return handleApiError(e);
  }
}
