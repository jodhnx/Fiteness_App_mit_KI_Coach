import type { CoachChatListItem } from "@/lib/coach-chats";
import type { CoachChatMessage } from "@/lib/coach-chat-cache";

export type { CoachChatMessage };

export type CachedCoachThread = {
  chatId: string;
  title: string;
  messages: CoachChatMessage[];
  updatedAt: number;
};

const LIST_KEY = "nexform-coach-chat-list";
const THREAD_PREFIX = "nexform-coach-thread:";
const ACTIVE_KEY = "nexform-coach-active-chat";
const LEGACY_KEY = "nexform-coach-chat";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadCachedCoachChatList(): {
  chats: CoachChatListItem[];
  updatedAt: number;
} | null {
  if (typeof window === "undefined") return null;
  const parsed = safeParse<{ chats: CoachChatListItem[]; updatedAt: number }>(
    localStorage.getItem(LIST_KEY)
  );
  if (!parsed?.chats || Date.now() - parsed.updatedAt > MAX_AGE_MS) {
    try {
      localStorage.removeItem(LIST_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
  return parsed;
}

export function saveCachedCoachChatList(chats: CoachChatListItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LIST_KEY,
      JSON.stringify({ chats, updatedAt: Date.now() })
    );
  } catch {
    /* quota */
  }
}

export function loadCachedCoachThread(
  chatId: string
): CachedCoachThread | null {
  if (typeof window === "undefined" || !chatId) return null;
  const parsed = safeParse<CachedCoachThread>(
    localStorage.getItem(THREAD_PREFIX + chatId)
  );
  if (!parsed?.messages || Date.now() - parsed.updatedAt > MAX_AGE_MS) {
    try {
      localStorage.removeItem(THREAD_PREFIX + chatId);
    } catch {
      /* ignore */
    }
    return null;
  }
  return {
    ...parsed,
    messages: parsed.messages.filter(
      (m) => m.role !== "assistant" || Boolean(m.content?.trim())
    ),
  };
}

export function saveCachedCoachThread(data: {
  chatId: string;
  title?: string;
  messages: CoachChatMessage[];
}) {
  if (typeof window === "undefined" || !data.chatId) return;
  try {
    const messages = data.messages.filter(
      (m) => m.role !== "assistant" || Boolean(m.content?.trim())
    );
    const payload: CachedCoachThread = {
      chatId: data.chatId,
      title: data.title ?? "Chat",
      messages,
      updatedAt: Date.now(),
    };
    localStorage.setItem(THREAD_PREFIX + data.chatId, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function removeCachedCoachThread(chatId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(THREAD_PREFIX + chatId);
  } catch {
    /* ignore */
  }
}

export function getActiveCoachChatId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function setActiveCoachChatId(chatId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (chatId) sessionStorage.setItem(ACTIVE_KEY, chatId);
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** Wipe all coach list/thread caches (logout). */
export function clearAllCoachChatCaches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LIST_KEY);
    localStorage.removeItem(LEGACY_KEY);
    sessionStorage.removeItem(ACTIVE_KEY);
    const remove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(THREAD_PREFIX)) remove.push(k);
    }
    for (const k of remove) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function relativeChatTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d === 1) return "gestern";
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
  });
}
