"use client";

import { memo } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { useNotifications } from "@/components/providers/notification-provider";
import { cn } from "@/lib/utils";

function greetingPart(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morgen";
  if (h < 18) return "Mittag";
  return "Abend";
}

/** Compact home top bar (~52px) — replaces global header on /home */
export const HomeCompactHeader = memo(function HomeCompactHeader({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  const { setOpen } = useNotifications();
  const first = name?.trim().split(/\s+/)[0];

  return (
    <header className="mobile-app-header sticky top-0 z-30 border-b border-white/10 backdrop-blur-2xl transform-gpu">
      <div
        className={cn(
          "mobile-app-frame flex items-center gap-3 px-3",
          "h-[3.25rem] min-h-[3.25rem] max-h-[3.25rem]"
        )}
      >
        <Link href="/settings" prefetch className="shrink-0 active:scale-95 transition-transform">
          <UserAvatar src={image} name={name} size="md" />
        </Link>

        <div className="flex-1 min-w-0 leading-tight">
          <p className="text-[11px] text-zinc-500 truncate">Guten {greetingPart()}</p>
          <p className="text-sm font-semibold text-white truncate">
            {first ?? "Willkommen"}
          </p>
        </div>

        <button
          type="button"
          aria-label="Benachrichtigungen"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            "header-glass-btn text-zinc-300 active:scale-95 transition-transform"
          )}
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
});
