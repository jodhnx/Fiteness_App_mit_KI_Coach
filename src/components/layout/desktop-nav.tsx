"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav-active";
import {
  DESKTOP_NAV,
  MORE_NAV,
  ADMIN_NAV,
} from "@/lib/nav-items";
import { hapticTap } from "@/lib/haptic";

/** Desktop sidebar — persistent navigation on lg+ screens. */
export const DesktopNav = memo(function DesktopNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside
      className="desktop-nav hidden lg:flex lg:flex-col lg:w-56 xl:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] lg:border-r lg:border-white/[0.06] lg:bg-zinc-950/80 lg:backdrop-blur-xl"
      aria-label="Desktop Navigation"
    >
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <Link href="/home" className="block" prefetch>
          <span className="text-xl font-bold text-white tracking-tight">
            NEX<span className="text-accent">FORM</span>
          </span>
          <span className="block text-[11px] text-zinc-500 mt-0.5">
            Train · Fuel · Rise
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {DESKTOP_NAV.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              scroll={false}
              onClick={() => hapticTap()}
              className={cn(
                "desktop-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 text-accent border border-accent/20"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 1.85} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-2 border-t border-white/[0.06]">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Mehr
          </p>
          {MORE_NAV.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                scroll={false}
                className={cn(
                  "desktop-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href={ADMIN_NAV.href}
              prefetch
              className={cn(
                "desktop-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 min-h-11 text-sm font-medium mt-1",
                pathname.startsWith("/admin")
                  ? "bg-accent/15 text-accent"
                  : "text-zinc-400 hover:bg-white/[0.04]"
              )}
            >
              <ADMIN_NAV.icon className="h-5 w-5 shrink-0" />
              <span>{ADMIN_NAV.label}</span>
            </Link>
          )}
        </div>
      </nav>
    </aside>
  );
});
