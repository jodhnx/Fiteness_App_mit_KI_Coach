"use client";

import { memo } from "react";
import Link from "next/link";
import { hapticTap } from "@/lib/haptic";

type Props = {
  workoutHref?: string;
  workoutLabel?: string;
};

const BTN =
  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-[1rem] border border-zinc-200/90 bg-white px-1 py-2.5 text-[11px] font-semibold text-zinc-700 shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 dark:border-white/[0.07] dark:bg-[#1a1a21] dark:text-zinc-200 dark:shadow-none dark:active:bg-white/[0.05]";

function IconPlusFood() {
  return (
    <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg className="h-4 w-4 text-teal-400" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8h3l2-2h6l2 2h3v12H4V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg className="h-4 w-4 text-[var(--accent,#6d5dfe)]" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconBook() {
  return (
    <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M5 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Compact nutrition-first quick actions for Home. */
export const HomeQuickActions = memo(function HomeQuickActions(_props: Props) {
  return (
    <div className="grid grid-cols-4 gap-2" aria-label="Schnellaktionen">
      <Link
        href="/nutrition?add=LUNCH"
        prefetch
        className={BTN}
        aria-label="Essen hinzufügen"
        onClick={() => hapticTap()}
      >
        <IconPlusFood />
        + Essen
      </Link>
      <Link
        href="/nutrition?photo=1"
        prefetch
        className={BTN}
        aria-label="Foto AI"
        onClick={() => hapticTap()}
      >
        <IconCamera />
        Foto
      </Link>
      <Link
        href="/nutrition?quick=1"
        prefetch
        className={BTN}
        aria-label="Schnelleintrag"
        onClick={() => hapticTap()}
      >
        <IconBolt />
        Schnell
      </Link>
      <Link
        href="/rezepte"
        prefetch
        className={BTN}
        aria-label="Rezepte"
        onClick={() => hapticTap()}
      >
        <IconBook />
        Rezepte
      </Link>
    </div>
  );
});
