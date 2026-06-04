"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { Home, Dumbbell, Apple, Footprints, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/activities", label: "Aktivität", icon: Footprints },
  { href: "/coach", label: "KI Coach", icon: Bot },
  { href: "/profile", label: "Profil", icon: User },
] as const;

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 bg-zinc-950/95 backdrop-blur-xl safe-area-pb"
      aria-label="Hauptnavigation"
    >
      <div className="flex items-stretch justify-around px-1 pt-1 pb-2 max-w-lg mx-auto">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(`${href}/`)) ||
            (href === "/home" && pathname === "/dashboard");
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors duration-100",
                active ? "text-accent" : "text-zinc-500"
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "stroke-[2.5]")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate max-w-[56px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});
