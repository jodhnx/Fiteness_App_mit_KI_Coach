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
  featured?: boolean;
};

export function TrainingChoiceCard({
  href,
  title,
  description,
  icon: Icon,
  iconClassName,
  meta,
  onClick,
  featured,
}: Props) {
  const inner = (
    <>
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          iconClassName ?? "bg-cyan-500/15 text-cyan-400"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-white">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-zinc-400">{description}</p>
        {meta && (
          <p className="mt-1.5 text-xs font-medium text-cyan-400/85">{meta}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all active:scale-[0.99]",
    featured
      ? "border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-zinc-900/80 hover:border-cyan-500/40"
      : "border-white/[0.08] bg-zinc-900/70 hover:border-white/[0.14] hover:bg-zinc-900"
  );

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
