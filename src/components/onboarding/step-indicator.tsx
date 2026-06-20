"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  step: number;
  total: number;
  label?: string;
};

export const StepIndicator = memo(function StepIndicator({ step, total, label }: Props) {
  const pct = Math.round((step / total) * 100);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-cyan-400/80 mb-2">
        <span>Schritt {step} / {total}</span>
        {label && <span className="text-zinc-500 normal-case tracking-normal">{label}</span>}
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden backdrop-blur-sm border border-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 transition-[width] duration-300 ease-out shadow-[0_0_12px_rgba(34,211,238,0.45)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

export function GlassCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl shadow-xl shadow-black/20 p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
