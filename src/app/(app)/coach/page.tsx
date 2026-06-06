"use client";

import { useRef, useState, useCallback, memo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Button } from "@/components/ui/button";
import { Send, Bot } from "lucide-react";
import { toast } from "sonner";
import { CoachQuickActions } from "@/components/coach/coach-quick-actions";

type Message = { role: string; content: string };

const ChatBubble = memo(function ChatBubble({
  role,
  content,
}: {
  role: string;
  content: string;
}) {
  return (
    <div
      className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
        role === "user"
          ? "ml-auto bg-cyan-500/20 text-cyan-50 border border-cyan-500/25"
          : "mr-auto bg-zinc-800/90 text-zinc-100 border border-white/5"
      }`}
    >
      {content}
    </div>
  );
});

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollRef = useRef(false);

  useCachedFetch<{ summary: string; tips: unknown[] }>(
    "coach-insights",
    "/api/coach/insights",
    90_000,
    10_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const scrollChatToBottom = useCallback(() => {
    if (!shouldScrollRef.current || !chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, []);

  async function sendMessage(userMsg: string) {
    if (!userMsg.trim() || loading) return;
    const text = userMsg.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    shouldScrollRef.current = true;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    requestAnimationFrame(scrollChatToBottom);

    const res = await fetch("/api/coach/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, chatId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Fehler");
      return;
    }
    if (data.chatId) setChatId(data.chatId);
    setMessages((m) => [...m, { role: "assistant", content: data.message }]);
    requestAnimationFrame(scrollChatToBottom);
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  return (
    <div className="coach-page-root max-w-2xl mx-auto -mx-1">
      <div className="shrink-0 mb-3">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400 font-extrabold tracking-tight">
            NEXFORM
          </span>
          <span className="text-zinc-400 font-medium text-base">Coach</span>
        </h1>
      </div>

      <div className="shrink-0 mb-3 card-premium p-3">
        <CoachQuickActions onAsk={(t) => void sendMessage(t)} disabled={loading} compact />
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden">
        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
          <Bot className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-300">Chat</span>
        </div>

        <div
          ref={chatScrollRef}
          className="overflow-y-auto overscroll-contain px-3 py-3 space-y-2.5 min-h-[12rem] max-h-[min(50dvh,480px)] scrollbar-hide coach-chat-messages"
        >
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-6 px-4">
              Wähle eine Schnellaktion oder schreib deine Frage — das Eingabefeld ist immer unten fixiert.
            </p>
          )}
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} content={m.content} />
          ))}
          {loading && (
            <p className="text-xs text-zinc-500 animate-pulse px-1">Coach antwortet…</p>
          )}
        </div>
      </div>

      {/* Fixed above bottom nav — WhatsApp / ChatGPT style */}
      <div
        className="coach-input-dock fixed left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/98 backdrop-blur-xl px-4 pt-3 pb-3"
        style={{
          bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={onInput}
            rows={1}
            placeholder="Nachricht an deinen Coach..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            className="flex-1 min-h-[52px] max-h-32 resize-none rounded-2xl border border-zinc-600 bg-zinc-900 px-4 py-3.5 text-[16px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <Button
            size="icon"
            className="h-[52px] w-[52px] shrink-0 rounded-2xl btn-accent"
            onClick={() => void sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Senden"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Spacer so last messages aren't hidden behind fixed input */}
      <div className="h-[5.5rem]" aria-hidden />
    </div>
  );
}
