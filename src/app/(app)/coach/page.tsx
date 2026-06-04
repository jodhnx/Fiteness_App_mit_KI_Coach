"use client";

import { useRef, useState, useCallback } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Button } from "@/components/ui/button";
import { Send, Bot } from "lucide-react";
import { toast } from "sonner";
import { CoachRecommendations } from "@/components/coach/coach-recommendations";
import { CoachQuickActions } from "@/components/coach/coach-quick-actions";

type Message = { role: string; content: string };
type Insight = {
  type: string;
  message: string;
  priority: string;
  actionHref?: string;
};

export default function CoachPage() {
  const { data: insights, loading: insightsLoading } = useCachedFetch<{
    summary: string;
    tips: Insight[];
  }>("coach-insights", "/api/coach/insights", 90_000, 10_000, {
    revalidateOnMount: false,
    staleRatio: 0.95,
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldScrollRef = useRef(false);

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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  }

  return (
    <div className="flex flex-col space-y-4 -mx-1">
      <div>
        <h1 className="text-xl font-bold text-white">KI Coach</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Training · Ernährung · Regeneration</p>
      </div>

      <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden min-h-[min(68dvh,600px)]">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
          <Bot className="h-5 w-5 text-cyan-400" />
          <span className="font-medium text-white">Chat</span>
        </div>

        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 min-h-[280px] max-h-[min(52dvh,480px)] scrollbar-hide"
        >
          {messages.length === 0 && (
            <CoachQuickActions onAsk={(t) => void sendMessage(t)} disabled={loading} />
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-2xl px-4 py-3.5 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "ml-auto bg-cyan-500/20 text-cyan-50 border border-cyan-500/30"
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

        <div className="shrink-0 p-3 border-t border-white/10 bg-zinc-950/90">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInput}
              rows={2}
              placeholder="Nachricht an den Coach…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
              className="flex-1 min-h-[56px] max-h-44 resize-none rounded-2xl border border-zinc-600 bg-zinc-900 px-4 py-3.5 text-[16px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            <Button
              size="icon"
              className="h-14 w-14 shrink-0 rounded-2xl btn-accent"
              onClick={() => void sendMessage(input)}
              disabled={loading || !input.trim()}
              aria-label="Senden"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <CoachRecommendations
        summary={insights?.summary}
        tips={insights?.tips ?? []}
        loading={insightsLoading}
      />
    </div>
  );
}
