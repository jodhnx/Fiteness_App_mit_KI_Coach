"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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
  }>("coach-insights", "/api/coach/insights", 90_000, 10_000);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setChatStarted(true);
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

  return (
    <div className="space-y-6 max-w-2xl mx-auto flex flex-col min-h-[calc(100vh-10rem)]">
      <PageHeader
        title="KI Coach"
        subtitle="Analysiert Ernährung, Training, Aktivitäten & Ziele – basierend auf deinen Daten"
      />

      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 to-zinc-900/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h2 className="font-semibold text-white">Deine Empfehlungen</h2>
        </div>
        {insightsLoading && !insights ? (
          <p className="text-sm text-zinc-500 animate-pulse">Analysiere deine Daten…</p>
        ) : (
          <>
            <p className="text-sm text-zinc-300 mb-3">{insights?.summary}</p>
            <ul className="space-y-2">
              {(insights?.tips ?? []).map((t, i) => (
                <li key={i}>
                  {t.actionHref ? (
                    <Link
                      href={t.actionHref}
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm ${
                        t.priority === "high"
                          ? "bg-violet-500/10 text-violet-100 border border-violet-500/20"
                          : "bg-zinc-800/60 text-zinc-300"
                      }`}
                    >
                      <span>{t.message}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                    </Link>
                  ) : (
                    <span
                      className={`block rounded-xl px-3 py-2.5 text-sm ${
                        t.priority === "high"
                          ? "bg-violet-500/10 text-violet-100"
                          : "bg-zinc-800/60 text-zinc-400"
                      }`}
                    >
                      {t.message}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="card-premium flex-1 flex flex-col min-h-[280px]">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-400" />
          <span className="font-medium text-white">Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
          {!chatStarted && messages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              Stelle eine Frage zu Training, Ernährung oder Regeneration – der Coach kennt
              deinen Kontext.
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-cyan-500/20 text-cyan-50 border border-cyan-500/25"
                  : "bg-zinc-800/80 text-zinc-200"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <p className="text-xs text-zinc-500 animate-pulse">Coach antwortet…</p>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="z. B. Was soll ich heute essen?"
            onKeyDown={(e) => e.key === "Enter" && send()}
            className="bg-zinc-900 border-zinc-700"
          />
          <Button size="icon" onClick={send} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
