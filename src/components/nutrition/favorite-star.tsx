"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  active: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export const FavoriteStar = memo(function FavoriteStar({
  active,
  onToggle,
  className,
  size = "md",
}: Props) {
  const dim =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-9 w-9" : "h-6 w-6";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={cn(
        "shrink-0 p-1 rounded-lg hover:bg-zinc-800/80 active:scale-95 transition-transform",
        className
      )}
      aria-label={active ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      title={active ? "Favorit" : "Als Favorit speichern"}
    >
      <Star
        className={cn(
          dim,
          active ? "fill-amber-400 text-amber-400" : "text-zinc-500 hover:text-amber-300"
        )}
      />
    </button>
  );
});
