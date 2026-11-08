"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  memo,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Send,
  Square,
  Copy,
  Check,
  ArrowLeft,
  PanelLeft,
} from "lucide-react";
import { toast } from "sonner";
import { CoachActionButtons } from "@/components/coach/coach-action-buttons";
import {
  CoachChatHub,
  EMPTY_SUGGESTIONS,
} from "@/components/coach/coach-chat-hub";
import type { CoachAction, CoachContextMode } from "@/lib/coach-actions";
import type { CoachChatListItem } from "@/lib/coach-chats";
import {
  loadCachedCoachChatList,
  saveCachedCoachChatList,
  loadCachedCoachThread,
  saveCachedCoachThread,
  removeCachedCoachThread,
  setActiveCoachChatId,
  getActiveCoachChatId,
} from "@/lib/coach-chat-store";
import { cn } from "@/lib/utils";

type UiMessage = {
  role: string;
  content: string;
  actions?: CoachAction[];
  id?: string;
};

type View = "hub" | "chat";

function renderCoachContent(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n");
    const isList =
      lines.every(
        (l) =>
          !l.trim() ||
          /^[-*•]\s+/.test(l.trim()) ||
          /^\*\*.+\*\*$/.test(l.trim())
      ) && lines.some((l) => /^[-*•]\s+/.test(l.trim()));
    if (isList) {
      return (
        <ul key={bi} className="my-1.5 list-disc space-y-1 pl-4">
          {lines
            .filter((l) => /^[-*•]\s+/.test(l.trim()))
            .map((l, li) => (
              <li key={li}>{formatInline(l.replace(/^[-*•]\s+/, ""))}</li>
            ))}
        </ul>
      );
    }
    return (
      <p key={bi} className="my-1">
        {lines.map((line, li) => (
          <span key={li}>
            {li > 0 ? <br /> : null}
            {formatInline(line)}
          </span>
        ))}
      </p>
    );
  });
}

function formatInline(line: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    parts.push(
      <strong key={key++} className="font-semibold text-zinc-900 dark:text-white">
        {m[1]}
      </strong>
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

const ChatBubble = memo(function ChatBubble({
  role,
  content,
  actions,
}: {
  role: string;
  content: string;
  actions?: CoachAction[];
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  async function copyText() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  return (
    <div className={`max-w-[94%] ${isUser ? "ml-auto" : "mr-auto"}`}>
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed",
          isUser
            ? "whitespace-pre-wrap border border-accent/25 bg-accent/15 text-zinc-900 dark:text-zinc-50"
            : "border border-zinc-200 bg-white text-zinc-800 dark:border-white/5 dark:bg-zinc-800/90 dark:text-zinc-100"
        )}
      >
        {isUser ? content : renderCoachContent(content)}
      </div>
      {!isUser && content && (
        <div className="mt-1.5 flex flex-col gap-1">
          {actions && actions.length > 0 && (
            <CoachActionButtons actions={actions} />
          )}
          <button
            type="button"
            onClick={() => void copyText()}
            className="inline-flex min-h-10 w-fit items-center gap-1.5 px-1 text-xs text-zinc-500"
            aria-label="Antwort kopieren"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Kopiert" : "Kopieren"}
          </button>
        </div>
      )}
    </div>
  );
});

let listInflight: Promise<CoachChatListItem[]> | null = null;

function fetchChatList(q?: string): Promise<CoachChatListItem[]> {
  const url = q?.trim()
    ? `/api/coach/chats?q=${encodeURIComponent(q.trim())}`
    : "/api/coach/chats";
  if (!q?.trim() && listInflight) return listInflight;
  const p = fetch(url, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (Array.isArray(d?.chats) ? (d.chats as CoachChatListItem[]) : []))
    .finally(() => {
      if (!q?.trim()) listInflight = null;
    });
  if (!q?.trim()) listInflight = p;
  return p;
}

const threadInflight = new Map<string, Promise<UiMessage[]>>();

function fetchThread(chatId: string): Promise<{
  title: string;
  messages: UiMessage[];
}> {
  const existing = threadInflight.get(chatId);
  if (existing) {
    return existing.then((messages) => ({
      title: loadCachedCoachThread(chatId)?.title ?? "Chat",
      messages,
    }));
  }
  const p = fetch(`/api/coach/chats/${chatId}`, { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d?.id) return { title: "Chat", messages: [] as UiMessage[] };
      const messages = (d.messages as UiMessage[]).filter(
        (m) => m.role === "user" || Boolean(m.content?.trim())
      );
      saveCachedCoachThread({
        chatId: d.id,
        title: d.title,
        messages,
      });
      return { title: d.title as string, messages };
    })
    .finally(() => {
      threadInflight.delete(chatId);
    });
  threadInflight.set(
    chatId,
    p.then((x) => x.messages)
  );
  return p;
}

export default function CoachPage() {
  const [view, setView] = useState<View>("hub");
  const [chats, setChats] = useState<CoachChatListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>();
  const [chatTitle, setChatTitle] = useState("Neuer Chat");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatIdRef = useRef<string | undefined>(undefined);
  const [retryPrompt, setRetryPrompt] = useState<{
    text: string;
    contextMode?: CoachContextMode;
  } | null>(null);

  const refreshList = useCallback(async (q?: string) => {
    setListLoading(true);
    try {
      const next = await fetchChatList(q);
      setChats(next);
      if (!q?.trim()) saveCachedCoachChatList(next);
    } catch {
      /* keep cache */
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = loadCachedCoachChatList();
    if (cached?.chats.length) {
      setChats(cached.chats);
      setListLoading(false);
    }
    void refreshList();

    // Deep-link / restore last active chat only if user had one open this session
    const params = new URLSearchParams(window.location.search);
    const qChat = params.get("chat");
    const isNew = params.get("new") === "1";
    if (isNew) {
      openNewChat();
      return;
    }
    if (qChat) {
      void openChat(qChat);
      return;
    }
    const active = getActiveCoachChatId();
    if (active) {
      // Stay on hub by default for overview UX — only restore if ?chat was set.
      // Active id is for highlighting after returning from chat.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshList(search);
    }, search.trim() ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [search, refreshList]);

  useEffect(() => {
    if (!chatId || messages.length === 0) return;
    const persistable = messages
      .filter((m) => m.role === "user" || Boolean(m.content?.trim()))
      .map(({ role, content }) => ({ role, content }));
    saveCachedCoachThread({
      chatId,
      title: chatTitle,
      messages: persistable,
    });
  }, [messages, chatId, chatTitle]);

  const scrollChatToBottom = useCallback(() => {
    if (!shouldScrollRef.current || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, []);

  function openNewChat() {
    abortRef.current?.abort();
    chatIdRef.current = undefined;
    setChatId(undefined);
    setChatTitle("Neuer Chat");
    setMessages([]);
    setRetryPrompt(null);
    setInput("");
    setActiveCoachChatId(null);
    setView("chat");
    setSidebarOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("chat");
    url.searchParams.set("new", "1");
    window.history.replaceState({}, "", url.pathname + url.search);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function openChat(id: string) {
    abortRef.current?.abort();
    setView("chat");
    setSidebarOpen(false);
    chatIdRef.current = id;
    setChatId(id);
    setActiveCoachChatId(id);
    setRetryPrompt(null);

    const cached = loadCachedCoachThread(id);
    if (cached?.messages.length) {
      setMessages(cached.messages);
      setChatTitle(cached.title);
      setThreadLoading(false);
    } else {
      setMessages([]);
      setThreadLoading(true);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    url.searchParams.set("chat", id);
    window.history.replaceState({}, "", url.pathname + url.search);

    try {
      const data = await fetchThread(id);
      setMessages(data.messages);
      setChatTitle(data.title);
    } catch {
      if (!cached?.messages.length) toast.error("Chat konnte nicht geladen werden");
    } finally {
      setThreadLoading(false);
      shouldScrollRef.current = true;
      requestAnimationFrame(scrollChatToBottom);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function backToHub() {
    abortRef.current?.abort();
    setView("hub");
    setSidebarOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("chat");
    url.searchParams.delete("new");
    window.history.replaceState({}, "", url.pathname);
    void refreshList();
  }

  async function renameChat(id: string, title: string) {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    if (chatId === id) setChatTitle(title);
    try {
      const res = await fetch(`/api/coach/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("rename");
      void refreshList();
    } catch {
      toast.error("Umbenennen fehlgeschlagen");
      void refreshList();
    }
  }

  async function deleteChat(id: string) {
    setChats((prev) => prev.filter((c) => c.id !== id));
    removeCachedCoachThread(id);
    if (chatIdRef.current === id) {
      chatIdRef.current = undefined;
      setChatId(undefined);
      setMessages([]);
      setActiveCoachChatId(null);
      backToHub();
    }
    try {
      const res = await fetch(`/api/coach/chats/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete");
      const cached = loadCachedCoachChatList()?.chats ?? [];
      saveCachedCoachChatList(cached.filter((c) => c.id !== id));
      void refreshList();
    } catch {
      toast.error("Löschen fehlgeschlagen");
      void refreshList();
    }
  }

  const sendMessage = useCallback(
    async (userMsg: string, contextMode?: CoachContextMode) => {
      if (!userMsg.trim() || loading || streaming) return;
      const text = userMsg.trim();
      setView("chat");
      setInput("");
      setRetryPrompt(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      shouldScrollRef.current = true;
      setMessages((m) => [...m, { role: "user", content: text }]);
      setLoading(true);
      setStreaming(true);
      requestAnimationFrame(scrollChatToBottom);
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/coach/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            message: text,
            chatId: chatIdRef.current,
            stream: true,
            ...(contextMode ? { contextMode } : {}),
          }),
          signal: ac.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(
            (err as { error?: string }).error ?? "Coach nicht erreichbar"
          );
          setMessages((m) => m.slice(0, -1));
          setRetryPrompt({ text, contextMode });
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          toast.error("Streaming nicht verfügbar");
          setMessages((m) => m.slice(0, -1));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullReply = "";
        let replyActions: CoachAction[] | undefined;
        let resolvedChatId = chatIdRef.current;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6)) as {
                type: string;
                chatId?: string;
                text?: string;
                message?: string;
                actions?: CoachAction[];
              };
              if (payload.type === "meta" && payload.chatId) {
                resolvedChatId = payload.chatId;
                chatIdRef.current = payload.chatId;
                setChatId(payload.chatId);
                setActiveCoachChatId(payload.chatId);
                setChatTitle((t) =>
                  t === "Neuer Chat" ? text.slice(0, 48) : t
                );
                const url = new URL(window.location.href);
                url.searchParams.delete("new");
                url.searchParams.set("chat", payload.chatId);
                window.history.replaceState({}, "", url.pathname + url.search);
                if (payload.actions?.length) replyActions = payload.actions;
              }
              if (payload.type === "delta" && payload.text) {
                fullReply += payload.text;
                setMessages((m) => {
                  const next = [...m];
                  const idx = next.length - 1;
                  if (idx >= 0 && next[idx].role === "assistant") {
                    next[idx] = {
                      role: "assistant",
                      content: fullReply,
                      actions: replyActions,
                    };
                  }
                  return next;
                });
                requestAnimationFrame(scrollChatToBottom);
              }
              if (payload.type === "error") {
                toast.error(payload.message ?? "KI-Coach Fehler");
                setMessages((m) => {
                  const next = [...m];
                  if (
                    next[next.length - 1]?.role === "assistant" &&
                    !fullReply
                  ) {
                    next.pop();
                  }
                  return next;
                });
                setRetryPrompt({ text, contextMode });
              }
              if (payload.type === "done" && payload.message) {
                fullReply = payload.message;
                if (payload.actions?.length) replyActions = payload.actions;
                setMessages((m) => {
                  const next = [...m];
                  const idx = next.length - 1;
                  if (idx >= 0 && next[idx].role === "assistant") {
                    next[idx] = {
                      role: "assistant",
                      content: fullReply,
                      actions: replyActions,
                    };
                  }
                  return next;
                });
              }
            } catch {
              /* partial JSON */
            }
          }
        }

        if (!fullReply) {
          setMessages((m) => {
            const next = [...m];
            if (
              next[next.length - 1]?.role === "assistant" &&
              !next[next.length - 1].content
            ) {
              next.pop();
            }
            return next;
          });
        }

        if (resolvedChatId) {
          void refreshList();
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          setMessages((m) => {
            const next = [...m];
            if (
              next[next.length - 1]?.role === "assistant" &&
              !next[next.length - 1].content
            ) {
              next.pop();
            }
            return next;
          });
          return;
        }
        toast.error("Verbindung unterbrochen. Bitte erneut versuchen.");
        setRetryPrompt({ text, contextMode });
        setMessages((m) => m.slice(0, -2));
      } finally {
        setLoading(false);
        setStreaming(false);
        requestAnimationFrame(scrollChatToBottom);
      }
    },
    [loading, streaming, scrollChatToBottom, refreshList]
  );

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  const busy = loading || streaming;

  const hub = (
    <CoachChatHub
      chats={chats}
      loading={listLoading}
      search={search}
      onSearch={setSearch}
      onNewChat={openNewChat}
      onOpenChat={(id) => void openChat(id)}
      onRename={(id, title) => void renameChat(id, title)}
      onDelete={(id) => void deleteChat(id)}
      onSuggestion={(prompt, mode) => {
        openNewChat();
        void sendMessage(prompt, mode as CoachContextMode | undefined);
      }}
      activeChatId={chatId}
      compact={view === "chat"}
    />
  );

  if (view === "hub") {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-1 px-1 pb-24">
        {hub}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl gap-4 px-1 pb-[5.5rem] lg:pb-6">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden w-72 shrink-0 lg:block",
          sidebarOpen ? "lg:block" : "lg:block"
        )}
      >
        <div className="sticky top-2 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white/80 p-3 dark:border-white/[0.08] dark:bg-zinc-950/50">
          {hub}
        </div>
      </aside>

      {/* Mobile chat list sheet */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Schließen"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] overflow-y-auto bg-white p-4 shadow-xl dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Chats
              </p>
              <button
                type="button"
                className="text-sm text-accent"
                onClick={() => setSidebarOpen(false)}
              >
                Fertig
              </button>
            </div>
            {hub}
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={backToHub}
            className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-accent lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Übersicht
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 dark:border-white/10 dark:text-zinc-300 lg:hidden"
            aria-label="Chat-Liste"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-white">
              {chatTitle}
            </h2>
            {streaming && (
              <p className="text-xs text-accent animate-pulse">schreibt…</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-white/[0.08] dark:bg-zinc-900/50">
          <div
            ref={chatScrollRef}
            className="coach-chat-messages max-h-[min(62dvh,640px)] min-h-[14rem] space-y-3 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-hide"
            role="log"
            aria-live="polite"
            aria-label="Coach Chatverlauf"
          >
            {threadLoading && messages.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                Chat wird geladen…
              </p>
            )}
            {!threadLoading && messages.length === 0 && (
              <div className="space-y-4 px-2 py-6 text-center">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Neuer Chat — worüber möchtest du sprechen?
                </p>
                <p className="text-xs text-zinc-500">
                  Wähle einen Vorschlag oder stelle direkt eine Frage.
                </p>
                <div className="mx-auto grid max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                  {EMPTY_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void sendMessage(s.prompt, s.mode)
                      }
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-zinc-800 hover:border-accent/40 dark:border-white/[0.08] dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) =>
              m.content ? (
                <ChatBubble
                  key={m.id ?? `${m.role}-${i}`}
                  role={m.role}
                  content={m.content}
                  actions={m.actions}
                />
              ) : streaming || loading ? (
                <div
                  key={i}
                  className="mr-auto flex items-center gap-2 px-1 text-sm text-zinc-400"
                >
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/80 animate-pulse" />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent/60 animate-pulse"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-accent/40 animate-pulse"
                      style={{ animationDelay: "240ms" }}
                    />
                  </span>
                  Coach schreibt…
                </div>
              ) : null
            )}
            {retryPrompt && !busy && (
              <button
                type="button"
                className="min-h-11 text-sm font-medium text-accent"
                onClick={() =>
                  void sendMessage(retryPrompt.text, retryPrompt.contextMode)
                }
              >
                Erneut versuchen
              </button>
            )}
          </div>
        </div>

        <div
          className="coach-input-dock fixed left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 px-4 pt-3 pb-3 backdrop-blur dark:border-white/10 dark:bg-zinc-950/95 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
          style={{
            bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 lg:max-w-none">
            <label className="sr-only" htmlFor="coach-message">
              Nachricht an Coach
            </label>
            <textarea
              id="coach-message"
              ref={textareaRef}
              value={input}
              onChange={onInput}
              rows={1}
              placeholder="Frage deinen Coach…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              className="min-h-[52px] max-h-32 flex-1 resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-[16px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
            />
            {busy ? (
              <Button
                size="icon"
                variant="secondary"
                className="h-[52px] w-[52px] shrink-0 rounded-2xl"
                onClick={() => abortRef.current?.abort()}
                aria-label="Antwort abbrechen"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-[52px] w-[52px] shrink-0 rounded-2xl btn-accent"
                onClick={() => void sendMessage(input)}
                disabled={!input.trim()}
                aria-label="Senden"
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
