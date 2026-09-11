"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { tierGradient } from "@/components/gamification/tier-styles";
import { BADGE_TIER_LABELS, type BadgeTier } from "@/lib/achievement-catalog";
import { Sparkles, X } from "lucide-react";

export type UnlockPayload = {
  name: string;
  icon: string;
  tier: string;
  xpReward: number;
  kind?: "achievement" | "level";
};

const QUEUE_KEY = "gamification-unlock-queue";

export function pushLevelUpEvent(level: number) {
  pushUnlockEvent({
    name: `Level ${level}`,
    icon: "⬆️",
    tier: "gold",
    xpReward: 0,
    kind: "level",
  });
}

export function pushUnlockEvent(event: UnlockPayload) {
  if (typeof window === "undefined") return;
  const raw = sessionStorage.getItem(QUEUE_KEY);
  const queue: UnlockPayload[] = raw ? JSON.parse(raw) : [];
  queue.push(event);
  sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent("gamification-unlock"));
}

export function GamificationUnlockToast() {
  const [current, setCurrent] = useState<UnlockPayload | null>(null);
  const [visible, setVisible] = useState(false);

  function showNext() {
    try {
      const raw = sessionStorage.getItem(QUEUE_KEY);
      const queue: UnlockPayload[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(queue) || queue.length === 0) {
        setVisible(false);
        setCurrent(null);
        return;
      }
      const [next, ...rest] = queue;
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
      setCurrent(next);
      setVisible(true);
      window.setTimeout(() => {
        setVisible(false);
        window.setTimeout(showNext, 200);
      }, 2800);
    } catch (e) {
      console.error("[gamification-toast]", e);
      try {
        sessionStorage.removeItem(QUEUE_KEY);
      } catch {
        /* ignore */
      }
      setVisible(false);
      setCurrent(null);
    }
  }

  useEffect(() => {
    const handler = () => {
      if (!visible) showNext();
    };
    window.addEventListener("gamification-unlock", handler);
    return () => window.removeEventListener("gamification-unlock", handler);
  }, [visible]);

  if (!current) return null;

  return (
    <div
      className={cn(
        "fixed top-20 left-1/2 z-[100] w-[min(92vw,360px)] -translate-x-1/2 transition-all duration-200 pointer-events-auto",
        visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
      )}
      role="status"
    >
      <div className="rounded-2xl border border-accent/30 bg-white/95 backdrop-blur-xl shadow-2xl shadow-accent/10 p-4 dark:border-cyan-500/40 dark:bg-zinc-900/95 dark:shadow-cyan-500/10">
        <button
          type="button"
          className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white"
          onClick={() => setVisible(false)}
          aria-label="Schließen"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl",
              current.kind === "level"
                ? "animate-[bounce_0.6s_ease-in-out_3] from-violet-600/40 to-cyan-600/40"
                : "animate-[pulse_1s_ease-in-out_2]",
              tierGradient(current.tier)
            )}
          >
            {current.icon}
          </div>
          <div>
            <p className="text-xs text-accent flex items-center gap-1 dark:text-cyan-400">
              <Sparkles className="h-3 w-3" />
              {current.kind === "level" ? "Levelaufstieg!" : "Neuer Erfolg"}
            </p>
            <p className="font-bold text-zinc-900 dark:text-white">{current.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {current.kind === "level"
                ? "Weiter so — neue Belohnungen warten!"
                : `${BADGE_TIER_LABELS[current.tier as BadgeTier] ?? current.tier} · +${current.xpReward} XP`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
