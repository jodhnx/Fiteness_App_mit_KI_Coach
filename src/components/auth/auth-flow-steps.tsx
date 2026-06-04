"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Konto" },
  { n: 2, label: "E-Mail" },
  { n: 3, label: "Profil" },
] as const;

export function AuthFlowSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
              current >= s.n
                ? "bg-cyan-500 text-zinc-950"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {s.n}
          </div>
          <span
            className={cn(
              "text-xs hidden sm:inline",
              current >= s.n ? "text-white" : "text-zinc-500"
            )}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 mx-1",
                current > s.n ? "bg-cyan-500" : "bg-zinc-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
