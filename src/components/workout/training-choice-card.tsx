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
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          iconClassName ?? "bg-accent/12 text-accent"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">
          {title}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
        {meta ? (
          <p className="mt-1 text-xs font-medium text-zinc-500">{meta}</p>
        ) : null}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-600" />
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors active:scale-[0.99]",
    featured
      ? "border-accent/25 bg-white shadow-sm hover:bg-accent/5 dark:border-white/[0.14] dark:bg-zinc-900 dark:shadow-none dark:hover:border-white/[0.2]"
      : "border-zinc-200/90 bg-white shadow-sm hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-zinc-900/70 dark:shadow-none dark:hover:border-white/[0.14] dark:hover:bg-zinc-900"
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
