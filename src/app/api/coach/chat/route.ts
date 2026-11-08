import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/validations";
import {
  COACH_SYSTEM_PROMPT,
  chatCompletion,
  chatCompletionStream,
  isOpenAIConfigured,
  logAIUsage,
} from "@/lib/openai";
import { rateLimit } from "@/lib/security/rate-limit";
import { rateLimitAiUsage } from "@/lib/security/ai-rate-limit";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { buildSelectiveCoachContext } from "@/lib/coach-context-engine";
import type { CoachAction, CoachContextMode } from "@/lib/coach-actions";
import { generateLocalCoachReply } from "@/lib/coach-engine";
import { titleFromFirstMessage } from "@/lib/coach-chats";

const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_CHARS = 900;

function trimHistoryContent(content: string): string {
  if (content.length <= MAX_HISTORY_CHARS) return content;
  return `${content.slice(0, MAX_HISTORY_CHARS)}…`;
}

function sseLocalReply(opts: {
  chatId: string;
  mode: CoachContextMode;
  actions: CoachAction[];
  message: string;
}) {
  const encoder = new TextEncoder();
  const { chatId, mode, actions, message } = opts;
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "meta", chatId, mode, actions })}\n\n`
        )
      );
      // Deliver in a few chunks for progressive UI — no artificial delay.
      const chunkSize = Math.max(80, Math.ceil(message.length / 4));
      for (let i = 0; i < message.length; i += chunkSize) {
        const text = message.slice(i, i + chunkSize);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "delta", text })}\n\n`
          )
        );
      }
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "done",
            message,
            actions,
            mode,
            source: "local-engine",
          })}\n\n`
        )
      );
      controller.close();
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

async function prepareChat(
  userId: string,
  message: string,
  chatId?: string,
  contextMode?: CoachContextMode
) {
  const { contextText, mode, actions } = await buildSelectiveCoachContext(
    userId,
    message,
    contextMode ?? null
  );

  let chat = chatId
    ? await prisma.aIChat.findFirst({
        where: { id: chatId, userId },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: MAX_HISTORY_MESSAGES,
          },
        },
      })
    : null;

  if (!chat) {
    chat = await prisma.aIChat.create({
      data: {
        userId,
        title: titleFromFirstMessage(message),
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
    // Keep updatedAt fresh for list sorting
    await prisma.aIChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });
  }

  const history = [...chat.messages]
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: trimHistoryContent(m.content),
    }));
  if (chatId) {
    history.push({ role: "user", content: message });
  }

  const openAiMessages = [
    { role: "system" as const, content: COACH_SYSTEM_PROMPT },
    { role: "system" as const, content: contextText },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
  ];

  return { chatId: chat.id, openAiMessages, mode, actions, contextText, history };
}

async function persistAssistant(
  chatId: string,
  content: string,
  tokens: number,
  userId: string,
  endpoint: string,
  model: string
) {
  const trimmed = content.trim();
  if (!trimmed) return;
  await prisma.aIChatMessage.create({
    data: { chatId, role: "assistant", content: trimmed, tokens },
  });
  await prisma.aIChat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });
  await logAIUsage(userId, endpoint, tokens, model);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const chats = await prisma.aIChat.findMany({
      where: { userId: session.user.id },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 12 } },
      orderBy: { updatedAt: "desc" },
      take: 1,
    });
    const latest = chats[0];
    return jsonOk({
      chatId: latest?.id,
      messages:
        latest?.messages
          .slice()
          .reverse()
          .map((m) => ({ role: m.role, content: m.content })) ?? [],
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const guest = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isGuest: true },
    });
    const perMinute = guest?.isGuest ? 8 : 30;
    const memoryLimit = rateLimit(`coach:${session.user.id}`, perMinute, 60_000);
    const durableLimit = await rateLimitAiUsage(
      session.user.id,
      ["chat", "chat-stream"],
      perMinute,
      60_000
    );
    if (!memoryLimit.success || !durableLimit.success) {
      return jsonError(
        guest?.isGuest
          ? "Gast-Limit erreicht — bitte Konto erstellen für mehr Coach-Anfragen."
          : "Rate limit erreicht",
        429
      );
    }

    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Nachricht");

    const streamRequested =
      parsed.data.stream === true ||
      req.headers.get("accept")?.includes("text/event-stream");

    const { chatId, openAiMessages, mode, actions, contextText, history } =
      await prepareChat(
        session.user.id,
        parsed.data.message,
        parsed.data.chatId,
        parsed.data.contextMode as CoachContextMode | undefined
      );

    // API-key-free path: local knowledge + rule engine (default when no OpenAI).
    if (!isOpenAIConfigured()) {
      const local = generateLocalCoachReply({
        message: parsed.data.message,
        contextText,
        history,
        hint: (parsed.data.contextMode as CoachContextMode | undefined) ?? mode,
        actions,
      });
      await persistAssistant(
        chatId,
        local.message,
        Math.ceil(local.message.length / 4),
        session.user.id,
        "chat-local",
        "local-engine"
      );
      if (streamRequested) {
        return sseLocalReply({
          chatId,
          mode: local.mode,
          actions: local.actions,
          message: local.message,
        });
      }
      return jsonOk({
        chatId,
        message: local.message,
        mode: local.mode,
        actions: local.actions,
        source: "local-engine",
      });
    }

    if (streamRequested) {
      const result = await chatCompletionStream(openAiMessages, session.user.id);
      if ("error" in result) {
        // Fallback to local engine instead of dead-end error.
        const local = generateLocalCoachReply({
          message: parsed.data.message,
          contextText,
          history,
          hint: mode,
          actions,
        });
        await persistAssistant(
          chatId,
          local.message,
          Math.ceil(local.message.length / 4),
          session.user.id,
          "chat-local-fallback",
          "local-engine"
        );
        return sseLocalReply({
          chatId,
          mode: local.mode,
          actions: local.actions,
          message: local.message,
        });
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const meta: {
            type: string;
            chatId: string;
            mode: CoachContextMode;
            actions: CoachAction[];
          } = { type: "meta", chatId, mode, actions };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(meta)}\n\n`)
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
            const trimmed = full.trim();
            if (trimmed) {
              const tokens = Math.ceil(trimmed.length / 4);
              await persistAssistant(
                chatId,
                trimmed,
                tokens,
                session.user!.id,
                "chat-stream",
                result.model
              );
            }
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  message: trimmed,
                  actions,
                  mode,
                })}\n\n`
              )
            );
          } catch (e) {
            console.error("[coach/chat] stream error", e);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  message: "Antwort unterbrochen. Bitte erneut versuchen.",
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
    let trimmed = (content ?? "").trim();
    let replyMode = mode;
    let replyActions = actions;
    let replyTokens = tokens;

    // If OpenAI returned the "not configured" / unreachable stub, use local engine.
    if (
      !trimmed ||
      /OPENAI_API_KEY|nicht verfügbar|nicht erreichbar/i.test(trimmed)
    ) {
      const local = generateLocalCoachReply({
        message: parsed.data.message,
        contextText,
        history,
        hint: mode,
        actions,
      });
      trimmed = local.message;
      replyMode = local.mode;
      replyActions = local.actions;
      replyTokens = Math.ceil(trimmed.length / 4);
      await persistAssistant(
        chatId,
        trimmed,
        replyTokens,
        session.user.id,
        "chat-local-fallback",
        "local-engine"
      );
      return jsonOk({
        chatId,
        message: trimmed,
        mode: replyMode,
        actions: replyActions,
        source: "local-engine",
      });
    }

    await persistAssistant(
      chatId,
      trimmed,
      replyTokens,
      session.user.id,
      "chat",
      "gpt-4o-mini"
    );

    return jsonOk({
      chatId,
      message: trimmed,
      mode: replyMode,
      actions: replyActions,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
