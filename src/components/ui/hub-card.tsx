"use client";

import Link from "next/link";
import { memo } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  iconClassName?: string;
  badge?: string;
  className?: string;
};

export const HubCard = memo(function HubCard({
  href,
  title,
  description,
  icon: Icon,
  iconClassName = "text-accent",
  badge,
  className,
}: Props) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "card-premium flex items-center gap-4 p-4 min-h-[72px]",
        "hover:border-cyan-500/30 active:scale-[0.98] transition-[transform,border-color] duration-100",
        className
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800/80",
          iconClassName
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{title}</p>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5 truncate">{description}</p>
        )}
      </div>
      {badge && (
        <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full shrink-0">
          {badge}
        </span>
      )}
      <ChevronRight className="h-5 w-5 text-zinc-600 shrink-0" />
    </Link>
  );
});
