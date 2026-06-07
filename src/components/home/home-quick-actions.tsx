"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dumbbell, Apple, TrendingUp, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const OTHER_ACTIONS = [
  {
    href: "/nutrition?add=LUNCH",
    label: "Lebensmittel hinzufügen",
    icon: Apple,
    accent: "text-orange-400",
    bg: "from-orange-950/50 to-zinc-900/90 border-orange-500/25",
  },
  {
    href: "/progress",
    label: "Fortschritt",
    icon: TrendingUp,
    accent: "text-emerald-400",
    bg: "from-emerald-950/50 to-zinc-900/90 border-emerald-500/25",
  },
  {
    href: "/progress?log=1",
    label: "Gewicht eintragen",
    icon: Scale,
    accent: "text-violet-400",
    bg: "from-violet-950/50 to-zinc-900/90 border-violet-500/25",
  },
] as const;

type Props = {
  onStartTraining?: () => void | Promise<void>;
};

export function HomeQuickActions({ onStartTraining }: Props) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => (onStartTraining ? void onStartTraining() : router.push("/workouts"))}
        className={cn(
          "rounded-xl border p-4 min-h-[88px] flex flex-col justify-between text-left",
          "bg-gradient-to-br from-cyan-950/50 to-zinc-900/90 border-cyan-500/25",
          "hover:border-white/25 active:opacity-90"
        )}
      >
        <Dumbbell className="h-5 w-5 text-cyan-400" />
        <span className="text-sm font-semibold text-white leading-tight">Training starten</span>
      </button>
      {OTHER_ACTIONS.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={cn(
            "rounded-xl border p-4 min-h-[88px] flex flex-col justify-between",
            "bg-gradient-to-br hover:border-white/25 active:opacity-90",
            a.bg
          )}
        >
          <a.icon className={cn("h-5 w-5", a.accent)} />
          <span className="text-sm font-semibold text-white leading-tight">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}
