"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ChefHat, Search, Zap, X } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { resetBodyScroll } from "@/lib/scroll-lock";

export type NutritionAddAction = "search" | "photo" | "quick" | "recipes";

type Props = {
  open: boolean;
  onClose: () => void;
  onAction: (action: NutritionAddAction) => void;
};

const ACTIONS: {
  id: NutritionAddAction;
  label: string;
  hint: string;
  icon: typeof Search;
}[] = [
  {
    id: "search",
    label: "Lebensmittel suchen",
    hint: "Datenbank & Favoriten",
    icon: Search,
  },
  {
    id: "photo",
    label: "Foto aufnehmen",
    hint: "KI analysiert dein Essen",
    icon: Camera,
  },
  {
    id: "quick",
    label: "Schnelleintrag",
    hint: "Nur Kalorien & Makros — ohne Lebensmittel",
    icon: Zap,
  },
  {
    id: "recipes",
    label: "Rezepte",
    hint: "Rezeptbibliothek öffnen",
    icon: ChefHat,
  },
];

/** Native-feel action sheet for Nutrition “+ Essen hinzufügen”. */
export const NutritionAddSheet = memo(function NutritionAddSheet({
  open,
  onClose,
  onAction,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Essen hinzufügen"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Schließen"
        onClick={() => {
          resetBodyScroll();
          onClose();
        }}
      />
      <div className="relative mx-auto w-full max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-4 duration-200">
        <div className="rounded-[1.35rem] border border-white/[0.1] bg-zinc-950/95 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <p className="text-sm font-semibold text-white">Essen hinzufügen</p>
            <button
              type="button"
              onClick={() => {
                resetBodyScroll();
                onClose();
              }}
              className="h-11 w-11 inline-flex items-center justify-center rounded-full text-zinc-400 hover:text-white"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ul className="px-2 pb-2 space-y-0.5">
            {ACTIONS.map(({ id, label, hint, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onAction(id)}
                  className="flex w-full min-h-14 items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/[0.06] active:bg-white/[0.09] transition-colors"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-zinc-100">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-white leading-tight">
                      {label}
                    </span>
                    <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>,
    document.body
  );
});
