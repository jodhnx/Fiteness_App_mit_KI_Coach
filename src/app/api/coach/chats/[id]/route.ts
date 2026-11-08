import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  deleteCoachChatForUser,
  getCoachChatForUser,
  renameCoachChatForUser,
} from "@/lib/coach-chats";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(80),
});

/** GET — messages for one chat (ownership required). */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    if (!id) return jsonError("Chat fehlt", 400);

    const before = req.nextUrl.searchParams.get("before") ?? undefined;
    const chat = await getCoachChatForUser(session.user.id, id, { before });
    if (!chat) return jsonError("Chat nicht gefunden", 404);
    return jsonOk(chat);
  } catch (e) {
    return handleApiError(e);
  }
}

/** PATCH — rename chat (ownership required). */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültiger Titel", 400);

    const updated = await renameCoachChatForUser(
      session.user.id,
      id,
      parsed.data.title
    );
    if (!updated) return jsonError("Chat nicht gefunden", 404);
    return jsonOk(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

/** DELETE — delete chat + messages (ownership required). */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const ok = await deleteCoachChatForUser(session.user.id, id);
    if (!ok) return jsonError("Chat nicht gefunden", 404);
    return jsonOk({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
