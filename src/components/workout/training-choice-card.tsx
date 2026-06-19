"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  meta?: string;
  onClick?: () => void;
};

export function TrainingChoiceCard({
  href,
  title,
  description,
  icon: Icon,
  iconClassName,
  meta,
  onClick,
}: Props) {
  const inner = (
    <>
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
          iconClassName ?? "bg-cyan-500/15 text-cyan-400"
        )}
      >
        <Icon className="h-7 w-7" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-bold text-white">{title}</p>
        <p className="text-sm text-zinc-400 mt-0.5">{description}</p>
        {meta && <p className="text-xs text-cyan-400/80 mt-2 font-medium">{meta}</p>}
      </div>
      <ChevronRight className="h-6 w-6 text-zinc-600 shrink-0" />
    </>
  );

  const className =
    "flex items-center gap-4 w-full rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 text-left transition-all active:scale-[0.98] hover:border-cyan-500/30 hover:bg-zinc-900";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={href} prefetch className={className}>
      {inner}
    </Link>
  );
}
