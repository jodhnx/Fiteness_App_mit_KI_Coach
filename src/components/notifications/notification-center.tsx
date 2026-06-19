"use client";

import { memo } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
import { useNotifications } from "@/components/providers/notification-provider";
import {
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
} from "@/lib/notification-types";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const FILTERS: { id: NotificationCategory | "all"; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "training", label: "Training" },
  { id: "nutrition", label: "Ernährung" },
  { id: "erfolge", label: "Erfolge" },
  { id: "coach", label: "Coach" },
  { id: "system", label: "System" },
];

const CATEGORY_ACCENT: Record<NotificationCategory, string> = {
  training: "bg-cyan-500/15 text-cyan-400",
  nutrition: "bg-orange-500/15 text-orange-400",
  erfolge: "bg-yellow-500/15 text-yellow-400",
  coach: "bg-violet-500/15 text-violet-400",
  system: "bg-zinc-700/40 text-zinc-300",
};

export const NotificationCenter = memo(function NotificationCenter() {
  const {
    open,
    setOpen,
    filtered,
    unreadCount,
    filter,
    setFilter,
    markRead,
    markAllRead,
  } = useNotifications();

  return (
    <MobileBottomSheet
      open={open}
      onClose={() => setOpen(false)}
      title="Benachrichtigungen"
      subtitle={unreadCount > 0 ? `${unreadCount} ungelesen` : "Alles gelesen"}
      variant="full"
      headerAction={
        unreadCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-cyan-400"
            onClick={markAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Alle gelesen
          </Button>
        ) : null
      }
    >
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-zinc-800/80 text-zinc-400 border border-transparent"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Bell className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Keine Benachrichtigungen</p>
            <p className="text-xs text-zinc-600 mt-1">
              Achievements, Streaks und Ziele erscheinen hier automatisch.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const inner = (
              <div
                className={cn(
                  "rounded-2xl border px-4 py-3 transition-colors",
                  n.read
                    ? "border-zinc-800/80 bg-zinc-900/40"
                    : "border-cyan-500/20 bg-cyan-950/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide font-semibold rounded-full px-2 py-0.5",
                      CATEGORY_ACCENT[n.category]
                    )}
                  >
                    {NOTIFICATION_CATEGORY_LABELS[n.category]}
                  </span>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-sm font-semibold text-white mt-2">{n.title}</p>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-zinc-600 mt-2">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: de })}
                </p>
              </div>
            );

            if (n.link) {
              return (
                <Link
                  key={n.id}
                  href={n.link}
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    setOpen(false);
                  }}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                className="w-full text-left"
                onClick={() => !n.read && markRead(n.id)}
              >
                {inner}
              </button>
            );
          })
        )}
      </div>
    </MobileBottomSheet>
  );
});
