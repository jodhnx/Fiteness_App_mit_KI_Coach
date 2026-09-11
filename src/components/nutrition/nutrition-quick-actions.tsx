"use client";

import { memo } from "react";
import { Camera, ChefHat, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onAddFood: () => void;
  onQuickEntry: () => void;
  onPhoto: () => void;
  onRecipes: () => void;
  /**
   * row = mobile 4-up only
   * stack = desktop stacked only
   * responsive = one DOM region (row mobile → stack desktop)
   */
  layout?: "row" | "stack" | "responsive";
  className?: string;
};

const ACTIONS = [
  {
    id: "add",
    label: "+ Essen",
    aria: "Lebensmittel suchen und hinzufügen",
    icon: Plus,
    handler: "onAddFood" as const,
  },
  {
    id: "quick",
    label: "Schnelleintrag",
    aria: "Kalorien und Makros schnell eintragen",
    icon: Zap,
    handler: "onQuickEntry" as const,
  },
  {
    id: "photo",
    label: "Foto",
    aria: "Essen fotografieren und analysieren",
    icon: Camera,
    handler: "onPhoto" as const,
  },
  {
    id: "recipes",
    label: "Rezepte",
    aria: "Rezeptbibliothek öffnen",
    icon: ChefHat,
    handler: "onRecipes" as const,
  },
] as const;

/** Primary Nutrition actions — single DOM region for mobile + desktop. */
export const NutritionQuickActions = memo(function NutritionQuickActions({
  onAddFood,
  onQuickEntry,
  onPhoto,
  onRecipes,
  layout = "row",
  className,
}: Props) {
  const handlers = {
    onAddFood,
    onQuickEntry,
    onPhoto,
    onRecipes,
  };

  const responsive = layout === "responsive";
  const stackOnly = layout === "stack";

  return (
    <nav
      aria-label="Ernährung Aktionen"
      className={cn(
        stackOnly && "flex flex-col gap-2",
        layout === "row" && "grid grid-cols-4 gap-1.5",
        responsive &&
          "grid grid-cols-4 gap-1.5 lg:flex lg:flex-col lg:gap-2",
        className
      )}
    >
      {ACTIONS.map(({ id, label, aria, icon: Icon, handler }) => (
        <button
          key={id}
          type="button"
          onClick={handlers[handler]}
          aria-label={aria}
          className={cn(
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
            stackOnly &&
              "flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 text-left text-sm font-semibold text-white hover:bg-white/[0.06] active:bg-white/[0.08]",
            layout === "row" &&
              "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-1 py-2 text-center active:bg-white/[0.07]",
            responsive &&
              "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-1 py-2 text-center active:bg-white/[0.07] lg:min-h-11 lg:w-full lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3.5 lg:py-0 lg:text-left lg:text-sm lg:font-semibold lg:text-white lg:hover:bg-white/[0.06]"
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center text-zinc-100",
              stackOnly && "h-9 w-9 rounded-lg bg-white/[0.07]",
              layout === "row" && "h-9 w-9 rounded-xl bg-white/[0.08]",
              responsive &&
                "h-9 w-9 rounded-xl bg-white/[0.08] lg:rounded-lg lg:bg-white/[0.07]"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span
            className={cn(
              stackOnly && "text-sm font-semibold text-white",
              layout === "row" &&
                "text-[10px] font-semibold leading-tight text-zinc-300 tracking-tight",
              responsive &&
                "text-[10px] font-semibold leading-tight text-zinc-300 tracking-tight lg:text-sm lg:text-white lg:tracking-normal"
            )}
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
});
