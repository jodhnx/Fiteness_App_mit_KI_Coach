"use client";

import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { cn } from "@/lib/utils";

export function Header({
  userName,
  userImage,
}: {
  userName?: string | null;
  userImage?: string | null;
}) {
  const { toggle } = useSidebar();

  return (
    <header className="mobile-app-header sticky top-0 z-30 border-b border-white/10 backdrop-blur-2xl transform-gpu">
      <div className="mobile-app-frame flex h-[3.75rem] items-center justify-between gap-3 px-3">
        <button
          type="button"
          onClick={toggle}
          aria-label="Menü öffnen"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            "header-glass-btn text-zinc-200 active:scale-95 transition-transform duration-100"
          )}
        >
          <Menu className="h-6 w-6" strokeWidth={2.25} />
        </button>

        <Link
          href="/settings"
          prefetch
          className="flex flex-1 justify-center min-w-0 active:scale-[0.98] transition-transform"
          aria-label="Account öffnen"
        >
          <span className="rounded-full ring-2 ring-accent/40 ring-offset-2 ring-offset-zinc-950 shadow-lg shadow-cyan-500/10">
            <UserAvatar src={userImage} name={userName} size="xl" />
          </span>
        </Link>

        <Link
          href="/settings#benachrichtigungen"
          prefetch
          aria-label="Benachrichtigungen"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            "header-glass-btn text-zinc-200 active:scale-95 transition-transform duration-100"
          )}
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}
