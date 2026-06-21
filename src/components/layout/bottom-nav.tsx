"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { Home, Dumbbell, Apple, TrendingUp, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav-active";

const ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Bot },
] as const;

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 bg-zinc-950/98 backdrop-blur-xl safe-area-pb transform-gpu"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto w-full max-w-[430px] flex items-stretch justify-between px-1 pt-1 pb-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              scroll={false}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 min-h-[52px] text-[11px] font-medium transition-colors duration-75 active:scale-95 transform-gpu",
                active ? "text-accent" : "text-zinc-500"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("h-6 w-6", active && "stroke-[2.5]")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate max-w-[72px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
