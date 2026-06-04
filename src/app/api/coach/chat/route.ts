import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations";
import { COACH_SYSTEM_PROMPT, chatCompletion } from "@/lib/openai";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const chats = await prisma.aIChat.findMany({
      where: { userId: session.user.id },
      include: { messages: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { updatedAt: "desc" },
    });
    return jsonOk({ chats });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const limit = rateLimit(`coach:${session.user.id}`, 30, 60_000);
    if (!limit.success) return jsonError("Rate limit erreicht", 429);

    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Nachricht");

    const { buildCoachUserContext } = await import("@/lib/coach-context");
    const context = await buildCoachUserContext(session.user.id);

    let chat = parsed.data.chatId
      ? await prisma.aIChat.findFirst({
          where: { id: parsed.data.chatId, userId: session.user.id },
          include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
        })
      : null;

    if (!chat) {
      chat = await prisma.aIChat.create({
        data: {
          userId: session.user.id,
          title: parsed.data.message.slice(0, 40),
          messages: {
            create: { role: "user", content: parsed.data.message },
          },
        },
        include: { messages: true },
      });
    } else {
      await prisma.aIChatMessage.create({
        data: { chatId: chat.id, role: "user", content: parsed.data.message },
      });
    }

    const history = chat.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    history.push({ role: "user", content: parsed.data.message });

    const { content, tokens } = await chatCompletion(
      [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "system", content: context },
        ...history.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
      ],
      session.user.id
    );

    await prisma.aIChatMessage.create({
      data: { chatId: chat.id, role: "assistant", content, tokens },
    });
    await prisma.aIChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    return jsonOk({ chatId: chat.id, message: content });
  } catch (e) {
    return handleApiError(e);
  }
}
