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
    primary: true,
  },
  {
    id: "quick",
    label: "Schnelleintrag",
    aria: "Kalorien und Makros schnell eintragen",
    icon: Zap,
    handler: "onQuickEntry" as const,
    primary: false,
  },
  {
    id: "photo",
    label: "Foto",
    aria: "Essen fotografieren und analysieren",
    icon: Camera,
    handler: "onPhoto" as const,
    primary: false,
  },
  {
    id: "recipes",
    label: "Rezepte",
    aria: "Rezeptbibliothek öffnen",
    icon: ChefHat,
    handler: "onRecipes" as const,
    primary: false,
  },
] as const;

const BTN_BASE =
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

const BTN_SURFACE =
  "border border-zinc-200/90 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 active:bg-zinc-100 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-100 dark:shadow-none dark:hover:bg-white/[0.06] dark:active:bg-white/[0.08]";

const BTN_PRIMARY =
  "border border-accent/30 bg-accent text-white shadow-sm hover:brightness-95 active:brightness-90 dark:border-accent/40";

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
        responsive && "grid grid-cols-4 gap-1.5 lg:flex lg:flex-col lg:gap-2",
        className
      )}
    >
      {ACTIONS.map(({ id, label, aria, icon: Icon, handler, primary }) => (
        <button
          key={id}
          type="button"
          onClick={handlers[handler]}
          aria-label={aria}
          className={cn(
            BTN_BASE,
            primary ? BTN_PRIMARY : BTN_SURFACE,
            stackOnly &&
              "flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-sm font-semibold",
            layout === "row" &&
              "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center",
            responsive &&
              "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center lg:min-h-11 lg:w-full lg:flex-row lg:items-center lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3.5 lg:py-0 lg:text-left lg:text-sm lg:font-semibold"
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center",
              primary
                ? "text-white"
                : "text-zinc-700 dark:text-zinc-100",
              stackOnly &&
                cn(
                  "h-9 w-9 rounded-lg",
                  primary ? "bg-white/20" : "bg-zinc-100 dark:bg-white/[0.07]"
                ),
              layout === "row" &&
                cn(
                  "h-9 w-9 rounded-xl",
                  primary ? "bg-white/20" : "bg-zinc-100 dark:bg-white/[0.08]"
                ),
              responsive &&
                cn(
                  "h-9 w-9 rounded-xl lg:rounded-lg",
                  primary
                    ? "bg-white/20"
                    : "bg-zinc-100 dark:bg-white/[0.08] lg:dark:bg-white/[0.07]"
                )
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span
            className={cn(
              stackOnly && "text-sm font-semibold",
              layout === "row" &&
                "text-[10px] font-semibold leading-tight tracking-tight",
              responsive &&
                "text-[10px] font-semibold leading-tight tracking-tight lg:text-sm lg:tracking-normal",
              primary
                ? "text-white"
                : "text-zinc-700 dark:text-zinc-300 lg:dark:text-zinc-100"
            )}
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
});
