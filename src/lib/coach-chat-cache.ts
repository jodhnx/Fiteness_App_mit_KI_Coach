export type CoachChatMessage = { role: string; content: string };

export type CachedCoachChat = {
  chatId?: string;
  messages: CoachChatMessage[];
  updatedAt: number;
};

const STORAGE_KEY = "nexform-coach-chat";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function loadCachedCoachChat(): CachedCoachChat | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCoachChat;
    if (Date.now() - parsed.updatedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedCoachChat(data: Omit<CachedCoachChat, "updatedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedCoachChat = { ...data, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function clearCachedCoachChat() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
