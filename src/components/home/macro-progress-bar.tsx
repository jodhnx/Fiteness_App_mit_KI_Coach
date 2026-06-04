"use client";

import { cn } from "@/lib/utils";

export type MacroProgressStatus = "low" | "near" | "done";

export function macroProgressStatus(consumed: number, target: number): MacroProgressStatus {
  if (target <= 0) return "low";
  const pct = (consumed / target) * 100;
  if (pct >= 100) return "done";
  if (pct >= 80) return "near";
  return "low";
}

const BAR: Record<MacroProgressStatus, string> = {
  low: "bg-zinc-600",
  near: "bg-cyan-400",
  done: "bg-emerald-500",
};

export function MacroProgressBar({
  consumed,
  target,
  className,
}: {
  consumed: number;
  target: number;
  className?: string;
}) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  const status = macroProgressStatus(consumed, target);

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-white/10 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-200 ease-out", BAR[status])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
