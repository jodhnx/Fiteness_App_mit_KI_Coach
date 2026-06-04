"use client";

import { cn } from "@/lib/utils";

export const SETTINGS_CATEGORIES = [
  { id: "profil", label: "Profil" },
  { id: "ziele", label: "Ziele" },
  { id: "vitaldaten", label: "Vitaldaten" },
  { id: "ernaehrung", label: "Ernährung" },
  { id: "training", label: "Training" },
  { id: "design", label: "Design" },
  { id: "benachrichtigungen", label: "Benachrichtigungen" },
] as const;

export type SettingsCategoryId = (typeof SETTINGS_CATEGORIES)[number]["id"];

export function SettingsCategoryNav({
  active,
  onSelect,
}: {
  active: SettingsCategoryId;
  onSelect: (id: SettingsCategoryId) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {SETTINGS_CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            active === c.id
              ? "bg-accent text-[var(--accent-fg)]"
              : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
