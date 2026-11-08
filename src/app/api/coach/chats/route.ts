import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { listCoachChatsForUser } from "@/lib/coach-chats";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

/** GET — chat list (titles + preview). Messages loaded separately. */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const chats = await listCoachChatsForUser(session.user.id, { q });
    return jsonOk({ chats });
  } catch (e) {
    return handleApiError(e);
  }
}

/** POST — create empty chat shell (optional). Prefer create-on-first-message. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    const chat = await prisma.aIChat.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title?.trim() || "Neuer Chat",
      },
      select: { id: true, title: true, updatedAt: true, createdAt: true },
    });

    return jsonOk({
      chat: {
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt.toISOString(),
        createdAt: chat.createdAt.toISOString(),
        preview: null,
        messageCount: 0,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
