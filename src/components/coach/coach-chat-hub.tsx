"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  MessageSquarePlus,
  Search,
  Pencil,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CoachChatListItem } from "@/lib/coach-chats";
import { relativeChatTime } from "@/lib/coach-chat-store";

const EMPTY_SUGGESTIONS = [
  {
    label: "Analysiere meine Ernährung",
    prompt:
      "Analysiere meine Ernährung: Kalorien, Protein, Makros und offene Ziele heute. Gib konkrete Empfehlungen.",
    mode: "nutrition" as const,
  },
  {
    label: "Erstelle einen Trainingsplan",
    prompt:
      "Erstelle oder optimiere meinen Trainingsplan anhand Ziel, Erfahrung und verfügbaren Tagen.",
    mode: "plan" as const,
  },
  {
    label: "Wie verbessere ich meine Regeneration?",
    prompt:
      "Wie verbessere ich meine Regeneration? Berücksichtige Schlaf, Trainingsbelastung und Ruhe.",
    mode: "training" as const,
  },
  {
    label: "Hilf mir beim Muskelaufbau",
    prompt:
      "Hilf mir beim Muskelaufbau: Training, Protein, Kalorien und Progression — konkret und praxisnah.",
    mode: "training" as const,
  },
];

export function CoachChatHub({
  chats,
  loading,
  search,
  onSearch,
  onNewChat,
  onOpenChat,
  onRename,
  onDelete,
  onSuggestion,
  compact,
  activeChatId,
}: {
  chats: CoachChatListItem[];
  loading?: boolean;
  search: string;
  onSearch: (q: string) => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onSuggestion?: (prompt: string, mode?: string) => void;
  compact?: boolean;
  activeChatId?: string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.preview ?? "").toLowerCase().includes(q)
    );
  }, [chats, search]);

  function startRename(chat: CoachChatListItem) {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  }

  function commitRename() {
    if (!editingId) return;
    const t = editTitle.trim();
    if (t) onRename(editingId, t);
    setEditingId(null);
  }

  return (
    <div className={cn("space-y-5", compact && "space-y-3")}>
      {!compact && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Bot className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                AI Coach
              </h1>
              <p className="text-sm text-zinc-500">
                Training, Ernährung & Regeneration — persönlich und datenbasiert
              </p>
            </div>
          </div>
        </div>
      )}

      <Button
        type="button"
        className="h-12 w-full rounded-2xl btn-accent gap-2 text-[15px] font-semibold"
        onClick={onNewChat}
      >
        <MessageSquarePlus className="h-5 w-5" />
        Neuer Chat
      </Button>

      {!compact && onSuggestion && chats.length === 0 && !loading && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Einstieg
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EMPTY_SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSuggestion(s.prompt, s.mode)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left text-sm font-medium text-zinc-800 transition-colors hover:border-accent/40 hover:bg-accent/5 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-200"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Chats durchsuchen…"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:border-white/[0.08] dark:bg-zinc-900 dark:text-white"
            aria-label="Chats suchen"
          />
        </div>

        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Letzte Chats
          </h2>
          {loading ? (
            <span className="text-[11px] text-zinc-400">Laden…</span>
          ) : (
            <span className="text-[11px] text-zinc-400">
              {filtered.length} {filtered.length === 1 ? "Chat" : "Chats"}
            </span>
          )}
        </div>

        {filtered.length === 0 && !loading ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center dark:border-white/[0.08]">
            <MessageCircle className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {search.trim()
                ? "Keine Chats gefunden"
                : "Noch keine Unterhaltungen"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {search.trim()
                ? "Anderen Suchbegriff versuchen"
                : "Starte mit „Neuer Chat“ oder einer Schnellfrage"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-white/[0.06] dark:border-white/[0.08]">
            {filtered.map((chat) => {
              const active = activeChatId === chat.id;
              return (
                <li key={chat.id}>
                  <div
                    className={cn(
                      "group flex items-start gap-2 px-3 py-3 transition-colors",
                      active
                        ? "bg-accent/10"
                        : "bg-white hover:bg-zinc-50 dark:bg-zinc-950/40 dark:hover:bg-white/[0.04]"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onOpenChat(chat.id)}
                    >
                      {editingId === chat.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={commitRename}
                          className="h-8 w-full rounded-lg border border-accent/40 bg-white px-2 text-sm dark:bg-zinc-900"
                        />
                      ) : (
                        <p
                          className={cn(
                            "truncate text-sm font-semibold",
                            active
                              ? "text-accent"
                              : "text-zinc-900 dark:text-zinc-100"
                          )}
                        >
                          {chat.title}
                        </p>
                      )}
                      {chat.preview ? (
                        <p className="mt-0.5 line-clamp-1 text-[12px] text-zinc-500">
                          {chat.preview}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-[12px] text-zinc-400">
                          Leer
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {relativeChatTime(chat.updatedAt)}
                      </p>
                    </button>
                    <div className="flex shrink-0 gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                        aria-label="Umbenennen"
                        onClick={() => startRename(chat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-500/10 hover:text-red-500"
                        aria-label="Löschen"
                        onClick={() => {
                          if (
                            typeof window !== "undefined" &&
                            window.confirm("Chat wirklich löschen?")
                          ) {
                            onDelete(chat.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export { EMPTY_SUGGESTIONS };
