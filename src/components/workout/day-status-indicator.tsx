"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { DayStatus } from "@/lib/plan-day-status";
import { DAY_STATUS_GREEN } from "@/lib/plan-day-status";
import { Check } from "lucide-react";

type Props = {
  status: DayStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
};

export const DayStatusIndicator = memo(function DayStatusIndicator({
  status,
  size = "md",
  showLabel = false,
}: Props) {
  const dim = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  if (status === "rest") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-zinc-600", showLabel && "text-xs")}>
        <span className={cn(dim, "rounded-full border border-zinc-700 bg-zinc-800")} />
        {showLabel && "Pause"}
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span
        className={cn("inline-flex items-center gap-1", showLabel && "text-xs")}
        style={{ color: DAY_STATUS_GREEN }}
      >
        <span
          className={cn(dim, "rounded-full flex items-center justify-center")}
          style={{ backgroundColor: DAY_STATUS_GREEN }}
        >
          <Check className="h-2.5 w-2.5 text-zinc-950" strokeWidth={3} />
        </span>
        {showLabel && "Erledigt"}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-zinc-500", showLabel && "text-xs")}>
      <span className={cn(dim, "rounded-full border-2 border-zinc-600 bg-zinc-800/80")} />
      {showLabel && "Offen"}
    </span>
  );
});

export function dayStatusRowClass(status: DayStatus, selected?: boolean): string {
  if (status === "completed") {
    return cn(
      "border-[#4CAF50]/40 bg-[#4CAF50]/12",
      selected && "ring-2 ring-[#4CAF50]/50"
    );
  }
  if (status === "rest") {
    return "border-zinc-800/60 bg-zinc-900/30 opacity-70";
  }
  return cn(
    "border-zinc-800 bg-zinc-900/60",
    selected && "ring-2 ring-zinc-600"
  );
}
