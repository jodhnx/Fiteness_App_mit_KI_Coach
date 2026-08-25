"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Send, Bot, Square, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/layout/page-shell";
import { CoachQuickActions } from "@/components/coach/coach-quick-actions";
import { CoachStatusDashboard } from "@/components/coach/coach-status-dashboard";
import { CoachActionButtons } from "@/components/coach/coach-action-buttons";
import { PageIntro } from "@/components/guide/page-intro";
import {
  loadCachedCoachChat,
  saveCachedCoachChat,
  type CoachChatMessage,
} from "@/lib/coach-chat-cache";
import type { CoachAction, CoachContextMode } from "@/lib/coach-actions";

type UiMessage = CoachChatMessage & { actions?: CoachAction[] };

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
        className={`rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-cyan-500/20 text-cyan-50 border border-cyan-500/25"
            : "bg-zinc-800/90 text-zinc-100 border border-white/5"
        }`}
      >
        {content}
      </div>
      {!isUser && content && (
        <div className="mt-1.5 flex flex-col gap-1">
          {actions && actions.length > 0 && (
            <CoachActionButtons actions={actions} />
          )}
          <button
            type="button"
            onClick={() => void copyText()}
            className="inline-flex min-h-11 w-fit items-center gap-1.5 px-1 text-xs text-zinc-500 active:text-zinc-300"
            aria-label="Antwort kopieren"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
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

export default function CoachPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollRef = useRef(false);
  const hydratedRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const [retryPrompt, setRetryPrompt] = useState<{
    text: string;
    contextMode?: CoachContextMode;
  } | null>(null);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const cached = loadCachedCoachChat();
    if (cached?.messages.length) {
      setMessages(cached.messages);
      setChatId(cached.chatId);
    }
    const cacheFresh =
      cached?.messages.length && Date.now() - cached.updatedAt < 120_000;
    if (cacheFresh) return;

    fetch("/api/coach/chat")
      .then((r) => r.json())
      .then((d) => {
        if (d.messages?.length) {
          setMessages(d.messages);
          if (d.chatId) setChatId(d.chatId);
          saveCachedCoachChat({ chatId: d.chatId, messages: d.messages });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length === 0 && !chatId) return;
    saveCachedCoachChat({
      chatId,
      messages: messages.map(({ role, content }) => ({ role, content })),
    });
  }, [messages, chatId]);

  const scrollChatToBottom = useCallback(() => {
    if (!shouldScrollRef.current || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, []);

  const sendMessage = useCallback(
    async (userMsg: string, contextMode?: CoachContextMode) => {
      if (!userMsg.trim() || loading || streaming) return;
      const text = userMsg.trim();
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
            chatId,
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
                error?: string;
                actions?: CoachAction[];
              };
              if (payload.type === "meta" && payload.chatId) {
                setChatId(payload.chatId);
                if (payload.actions?.length) {
                  replyActions = payload.actions;
                }
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
                if (payload.actions?.length) {
                  replyActions = payload.actions;
                }
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
    [chatId, loading, streaming, scrollChatToBottom]
  );

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  const busy = loading || streaming;

  return (
    <PageShell maxWidth="2xl" className="coach-page-root -mx-1" bottomNav={false}>
      <div className="shrink-0 mb-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400 font-extrabold tracking-tight">
            NEXFORM
          </span>
          <span className="text-zinc-400 font-medium text-base">KI Coach</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Persönlich · datenbasiert · Training & Ernährung
        </p>
      </div>

      <div className="shrink-0 mb-3 space-y-3">
        <PageIntro pageId="coach" />
        <CoachStatusDashboard
          onAsk={(t) => void sendMessage(t)}
        />
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-3">
          <CoachQuickActions
            onAsk={(t, mode) => void sendMessage(t, mode)}
            disabled={busy}
            compact
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
          <Bot className="h-4 w-4 text-cyan-400" aria-hidden />
          <span className="text-sm font-medium text-zinc-300">Chat</span>
          {streaming && (
            <span className="ml-auto text-xs text-cyan-400/90 animate-pulse">
              schreibt…
            </span>
          )}
        </div>

        <div
          ref={chatScrollRef}
          className="overflow-y-auto overscroll-contain px-3 py-3 space-y-3 min-h-[12rem] max-h-[min(50dvh,480px)] scrollbar-hide coach-chat-messages"
          role="log"
          aria-live="polite"
          aria-label="Coach Chatverlauf"
        >
          {messages.length === 0 && (
            <div className="text-center py-8 px-4 space-y-2">
              <p className="text-sm text-zinc-300 font-medium">
                Dein persönlicher Coach ist bereit.
              </p>
              <p className="text-sm text-zinc-500">
                Schnellaktion wählen oder Frage stellen — der Coach nutzt nur
                relevante Daten zu deiner Anfrage.
              </p>
            </div>
          )}
          {messages.map((m, i) =>
            m.content ? (
              <ChatBubble
                key={i}
                role={m.role}
                content={m.content}
                actions={m.actions}
              />
            ) : (
              <div
                key={i}
                className="mr-auto flex items-center gap-2 px-1 text-sm text-zinc-400"
                aria-live="polite"
              >
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-cyan-400/60 animate-pulse"
                    style={{ animationDelay: "120ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-cyan-400/40 animate-pulse"
                    style={{ animationDelay: "240ms" }}
                  />
                </span>
                Coach schreibt…
              </div>
            )
          )}
          {retryPrompt && !busy && (
            <button
              type="button"
              className="text-sm font-medium text-accent min-h-11"
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
        className="coach-input-dock fixed left-0 right-0 z-40 border-t border-white/10 bg-zinc-950 px-4 pt-3 pb-3"
        style={{
          bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-end gap-2">
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
            className="flex-1 min-h-[52px] max-h-32 resize-none rounded-2xl border border-zinc-600 bg-zinc-900 px-4 py-3.5 text-[16px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
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

      <div className="h-[5.5rem]" aria-hidden />
    </PageShell>
  );
}
