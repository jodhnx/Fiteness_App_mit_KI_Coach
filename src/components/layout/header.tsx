"use client";

import { memo } from "react";
import { Bell } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { useNotifications } from "@/components/providers/notification-provider";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/haptic";

export const Header = memo(function Header({
  userName,
  userImage,
}: {
  userName?: string | null;
  userImage?: string | null;
}) {
  const { setOpen: setProfileOpen } = useSidebar();
  const { setOpen: setNotifOpen, unreadCount } = useNotifications();

  return (
    <header className="mobile-app-header sticky top-0 z-30 border-b border-white/10 backdrop-blur-2xl transform-gpu">
      <div className="mobile-app-frame flex h-[3.75rem] items-center justify-between gap-3 px-3">
        <div className="h-11 w-11 shrink-0" aria-hidden />

        <button
          type="button"
          onClick={() => {
            hapticTap();
            setProfileOpen(true);
          }}
          className="flex flex-1 justify-center min-w-0 active:scale-[0.98] transition-transform"
          aria-label="Profil & Menü öffnen"
        >
          <span className="rounded-full ring-2 ring-accent/40 ring-offset-2 ring-offset-zinc-950 shadow-lg shadow-cyan-500/10">
            <UserAvatar src={userImage} name={userName} size="xl" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setNotifOpen(true)}
          aria-label="Benachrichtigungen"
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            "header-glass-btn text-zinc-200 active:scale-95 transition-transform duration-100"
          )}
        >
          <Bell className="h-5 w-5" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-zinc-950">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
});
