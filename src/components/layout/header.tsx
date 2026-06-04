"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, Menu } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { useSidebar } from "@/components/layout/sidebar-provider";

export function Header({
  userName,
  userImage,
}: {
  userName?: string | null;
  userImage?: string | null;
}) {
  const { toggle } = useSidebar();

  return (
    <header className="mobile-app-header sticky top-0 z-30 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl transform-gpu">
      <div className="mobile-app-frame flex h-14 items-center justify-between gap-2 px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={toggle}
          aria-label="Menü öffnen"
        >
          <Menu className="h-6 w-6" />
        </Button>

        <Link
          href="/profile"
          prefetch
          className="flex flex-1 justify-center min-w-0 active:opacity-80"
          aria-label="Profil öffnen"
        >
          <UserAvatar src={userImage} name={userName} size="md" />
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          aria-label="Benachrichtigungen"
          asChild
        >
          <Link href="/settings#benachrichtigungen" prefetch>
            <Bell className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
