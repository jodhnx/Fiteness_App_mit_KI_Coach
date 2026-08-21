"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** 0–1 real progress — never faked with timers */
  progress: number;
  visible: boolean;
};

/**
 * One-shot cold-start splash. Parent must never remount this on menu switches.
 * Exit is near-instant — no artificial hold for animations.
 */
export function AppBootSplash({ progress, visible }: Props) {
  const [exiting, setExiting] = useState(false);
  const [gone, setGone] = useState(!visible);

  useEffect(() => {
    if (!visible && !gone) {
      setExiting(true);
      const t = window.setTimeout(() => setGone(true), 120);
      return () => window.clearTimeout(t);
    }
    if (visible) {
      setExiting(false);
      setGone(false);
    }
  }, [visible, gone]);

  if (gone) return null;

  const pct = Math.min(100, Math.max(4, Math.round(progress * 100)));

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center px-8",
        "bg-[#05080c] transition-opacity duration-100 ease-out",
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 28%, rgba(34,211,238,0.18), transparent 70%), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(6,182,212,0.08), transparent)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        <div className="relative">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-cyan-300 to-cyan-600 shadow-[0_0_40px_rgba(34,211,238,0.35)]">
            <span className="text-2xl font-black tracking-tight text-zinc-950">
              NX
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-center">
          <p className="text-xl font-bold tracking-[0.28em] text-white">
            NEX<span className="text-cyan-400">FORM</span>
          </p>
          <p className="text-sm text-zinc-500">Laden …</p>
        </div>

        <div className="w-44">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-[width] duration-100 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
