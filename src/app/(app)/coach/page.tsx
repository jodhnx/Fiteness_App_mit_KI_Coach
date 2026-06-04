"use client";

import { useEffect, useRef, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { Button } from "@/components/ui/button";
import { Send, Bot } from "lucide-react";
import { toast } from "sonner";
import { CoachRecommendations } from "@/components/coach/coach-recommendations";

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);
    const res = await fetch("/api/coach/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg, chatId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Fehler");
      return;
    }
    if (data.chatId) setChatId(data.chatId);
    setMessages((m) => [...m, { role: "assistant", content: data.message }]);
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-5.5rem)] -mx-1">
      <div className="px-1 pb-2">
        <h1 className="text-lg font-bold text-white">KI Coach</h1>
        <p className="text-xs text-zinc-500">Training · Ernährung · Regeneration</p>
      </div>

      <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden min-h-[min(72dvh,640px)] transform-gpu">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
          <Bot className="h-5 w-5 text-cyan-400" />
          <span className="font-medium text-white text-sm">Chat</span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3 scrollbar-hide">
          {messages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-12 px-4 leading-relaxed">
              Stelle eine Frage zu Training, Ernährung oder Regeneration – der Coach kennt
              deinen Kontext.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
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
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 p-3 border-t border-white/10 bg-zinc-950/90 safe-area-pb">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInput}
              rows={1}
              placeholder="Nachricht an den Coach…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="flex-1 min-h-[52px] max-h-40 resize-none rounded-2xl border border-zinc-600 bg-zinc-900 px-4 py-3.5 text-[16px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
            <Button
              size="icon"
              className="h-[52px] w-[52px] shrink-0 rounded-2xl btn-accent"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Senden"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 pb-2">
        <CoachRecommendations
          summary={insights?.summary}
          tips={insights?.tips ?? []}
          loading={insightsLoading}
        />
      </div>
    </div>
  );
}
