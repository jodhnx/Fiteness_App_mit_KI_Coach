import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations";
import {
  COACH_SYSTEM_PROMPT,
  chatCompletion,
  chatCompletionStream,
  logAIUsage,
} from "@/lib/openai";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

async function prepareChat(userId: string, message: string, chatId?: string) {
  const { buildCoachUserContext } = await import("@/lib/coach-context");
  const context = await buildCoachUserContext(userId);

  let chat = chatId
    ? await prisma.aIChat.findFirst({
        where: { id: chatId, userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      })
    : null;

  if (!chat) {
    chat = await prisma.aIChat.create({
      data: {
        userId,
        title: message.slice(0, 40),
        messages: {
          create: { role: "user", content: message },
        },
      },
      include: { messages: true },
    });
  } else {
    await prisma.aIChatMessage.create({
      data: { chatId: chat.id, role: "user", content: message },
    });
  }

  const history = chat.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  if (chatId) {
    history.push({ role: "user", content: message });
  }

  const openAiMessages = [
    { role: "system" as const, content: COACH_SYSTEM_PROMPT },
    { role: "system" as const, content: context },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
  ];

  return { chatId: chat.id, openAiMessages };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const chats = await prisma.aIChat.findMany({
      where: { userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    const latest = chats[0];
    return jsonOk({
      chatId: latest?.id,
      messages: latest?.messages.map((m) => ({ role: m.role, content: m.content })) ?? [],
    });
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

    const streamRequested =
      parsed.data.stream === true ||
      req.headers.get("accept")?.includes("text/event-stream");

    const { chatId, openAiMessages } = await prepareChat(
      session.user.id,
      parsed.data.message,
      parsed.data.chatId
    );

    if (streamRequested) {
      const result = await chatCompletionStream(openAiMessages, session.user.id);
      if ("error" in result) {
        const encoder = new TextEncoder();
        return new Response(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: result.error })}\n\n`),
          {
            status: 200,
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          }
        );
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "meta", chatId })}\n\n`
            )
          );
          let full = "";
          try {
            for await (const chunk of result.stream) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (!text) continue;
              full += text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "delta", text })}\n\n`
                )
              );
            }
            const tokens = Math.ceil(full.length / 4);
            await prisma.aIChatMessage.create({
              data: { chatId, role: "assistant", content: full, tokens },
            });
            await prisma.aIChat.update({
              where: { id: chatId },
              data: { updatedAt: new Date() },
            });
            await logAIUsage(session.user!.id, "chat-stream", tokens, result.model);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done", message: full })}\n\n`)
            );
          } catch (e) {
            console.error("[coach/chat] stream error", e);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message:
                    "Antwort unterbrochen. Bitte erneut versuchen.",
                })}\n\n`
              )
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const { content, tokens } = await chatCompletion(
      openAiMessages,
      session.user.id
    );

    await prisma.aIChatMessage.create({
      data: { chatId, role: "assistant", content, tokens },
    });
    await prisma.aIChat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return jsonOk({ chatId, message: content });
  } catch (e) {
    return handleApiError(e);
  }
}
