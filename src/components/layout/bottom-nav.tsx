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
    <nav className="app-bottom-nav lg:hidden" aria-label="Hauptnavigation">
      <div className="app-bottom-nav__inner mx-auto w-full max-w-[430px] px-1">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              scroll={false}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-75 active:scale-95",
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
