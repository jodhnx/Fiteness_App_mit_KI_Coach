"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href?: string;
  label?: string;
  className?: string;
  /** Prefer browser history when no href (or when history is meaningful). */
  preferHistory?: boolean;
  onClick?: () => void;
};

/** Compact back control for detail / sheet routes. */
export function DetailBackLink({
  href,
  label = "Zurück",
  className,
  preferHistory = false,
  onClick,
}: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-11 items-center gap-1 -ml-1 px-1 rounded-lg",
        "text-sm font-medium text-accent",
        "active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      aria-label={label}
      onClick={() => {
        onClick?.();
        if (preferHistory && typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        if (href) {
          router.push(href, { scroll: false });
          return;
        }
        router.back();
      }}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

/** Link variant when a stable href is preferred (prefetchable). */
export function DetailBackAnchor({
  href,
  label = "Zurück",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      scroll={false}
      className={cn(
        "inline-flex min-h-11 items-center gap-1 -ml-1 px-1 rounded-lg",
        "text-sm font-medium text-accent",
        "active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className
      )}
      aria-label={label}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
