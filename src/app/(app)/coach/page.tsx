"use client";

import { useRef, useState, useCallback } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Button } from "@/components/ui/button";
import { Send, Bot } from "lucide-react";
import { toast } from "sonner";
import { CoachQuickActions } from "@/components/coach/coach-quick-actions";

type Message = { role: string; content: string };

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollRef = useRef(false);

  useCachedFetch<{ summary: string; tips: unknown[] }>("coach-insights", "/api/coach/insights", 90_000, 10_000, {
    revalidateOnMount: false,
    staleRatio: 0.95,
  });

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
    <div className="flex flex-col -mx-1 max-w-2xl mx-auto pb-2 min-h-[calc(100dvh-8rem)]">
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

      <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden min-h-0">
        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 shrink-0">
          <Bot className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-medium text-zinc-300">Chatverlauf</span>
        </div>

        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2.5 min-h-[200px] max-h-[min(42dvh,420px)] scrollbar-hide"
        >
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8 px-4">
              Wähle eine Schnellaktion oder schreib unten deine Frage.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-cyan-500/20 text-cyan-50 border border-cyan-500/25"
                  : "mr-auto bg-zinc-800/90 text-zinc-100 border border-white/5"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <p className="text-xs text-zinc-500 animate-pulse px-1">Coach antwortet…</p>
          )}
        </div>

        <div className="shrink-0 p-3 border-t border-white/10 bg-zinc-950/95 safe-area-pb">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInput}
              rows={1}
              placeholder="Nachricht an den Coach..."
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
      </div>
    </div>
  );
}
