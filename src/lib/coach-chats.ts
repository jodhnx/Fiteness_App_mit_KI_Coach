import { prisma } from "@/lib/prisma";

export type CoachChatListItem = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  preview: string | null;
  messageCount: number;
};

export type CoachChatMessageDto = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

const LIST_TAKE = 40;
const MESSAGES_TAKE = 60;

export function titleFromFirstMessage(message: string): string {
  const t = message.trim().replace(/\s+/g, " ");
  if (!t) return "Neuer Chat";
  if (t.length <= 48) return t;
  return `${t.slice(0, 45)}…`;
}

export async function listCoachChatsForUser(
  userId: string,
  opts?: { q?: string; take?: number }
): Promise<CoachChatListItem[]> {
  const take = Math.min(opts?.take ?? LIST_TAKE, 80);
  const q = opts?.q?.trim();

  const chats = await prisma.aIChat.findMany({
    where: {
      userId,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              {
                messages: {
                  some: { content: { contains: q, mode: "insensitive" } },
                },
              },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true },
      },
    },
  });

  return chats.map((c) => {
    const last = c.messages[0];
    const preview = last
      ? last.content.replace(/\s+/g, " ").slice(0, 120)
      : null;
    return {
      id: c.id,
      title: c.title || "Neuer Chat",
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      preview,
      messageCount: c._count.messages,
    };
  });
}

export async function getCoachChatForUser(
  userId: string,
  chatId: string,
  opts?: { before?: string; take?: number }
): Promise<{
  id: string;
  title: string;
  updatedAt: string;
  messages: CoachChatMessageDto[];
  hasMore: boolean;
} | null> {
  const take = Math.min(opts?.take ?? MESSAGES_TAKE, 100);
  const chat = await prisma.aIChat.findFirst({
    where: { id: chatId, userId },
    select: { id: true, title: true, updatedAt: true },
  });
  if (!chat) return null;

  const messages = await prisma.aIChatMessage.findMany({
    where: {
      chatId,
      ...(opts?.before
        ? { createdAt: { lt: new Date(opts.before) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  const hasMore = messages.length > take;
  const slice = hasMore ? messages.slice(0, take) : messages;
  slice.reverse();

  return {
    id: chat.id,
    title: chat.title || "Neuer Chat",
    updatedAt: chat.updatedAt.toISOString(),
    messages: slice.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    hasMore,
  };
}

export async function renameCoachChatForUser(
  userId: string,
  chatId: string,
  title: string
): Promise<{ id: string; title: string } | null> {
  const clean = title.trim().slice(0, 80);
  if (!clean) return null;
  const existing = await prisma.aIChat.findFirst({
    where: { id: chatId, userId },
    select: { id: true },
  });
  if (!existing) return null;
  const updated = await prisma.aIChat.update({
    where: { id: chatId },
    data: { title: clean },
    select: { id: true, title: true },
  });
  return updated;
}

export async function deleteCoachChatForUser(
  userId: string,
  chatId: string
): Promise<boolean> {
  const existing = await prisma.aIChat.findFirst({
    where: { id: chatId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.aIChat.delete({ where: { id: chatId } });
  return true;
}
