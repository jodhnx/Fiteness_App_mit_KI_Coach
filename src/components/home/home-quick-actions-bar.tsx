"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, Dumbbell, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/nutrition?add=LUNCH",
    label: "Essen hinzufügen",
    icon: Apple,
    accent: "text-orange-400",
    bg: "from-orange-950/40 to-zinc-900/90 border-orange-500/20",
    isLink: true as const,
  },
  {
    label: "Workout starten",
    icon: Dumbbell,
    accent: "text-cyan-400",
    bg: "from-cyan-950/40 to-zinc-900/90 border-cyan-500/20",
    isLink: false as const,
  },
  {
    href: "/progress?log=1",
    label: "Gewicht eintragen",
    icon: Scale,
    accent: "text-violet-400",
    bg: "from-violet-950/40 to-zinc-900/90 border-violet-500/20",
    isLink: true as const,
  },
] as const;

export function HomeQuickActionsBar({ onStartWorkout }: { onStartWorkout?: () => void }) {
  const router = useRouter();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2.5 px-0.5">
        Schnellaktionen
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((a) => {
          const content = (
            <>
              <a.icon className={cn("h-5 w-5", a.accent)} />
              <span className="text-[11px] font-semibold text-white leading-tight mt-2">
                {a.label}
              </span>
            </>
          );
          const className = cn(
            "rounded-2xl border p-3 min-h-[5.5rem] flex flex-col items-center justify-center text-center",
            "bg-gradient-to-br active:scale-[0.98] transition-transform",
            a.bg
          );

          if (a.isLink) {
            return (
              <Link key={a.href} href={a.href} prefetch className={className}>
                {content}
              </Link>
            );
          }

          return (
            <button
              key={a.label}
              type="button"
              className={className}
              onClick={() => (onStartWorkout ? onStartWorkout() : router.push("/workouts"))}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
