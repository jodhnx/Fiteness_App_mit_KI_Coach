"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";

export function Header({
  userName,
  userImage,
}: {
  userName?: string | null;
  userImage?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/40 px-6 backdrop-blur-xl lg:pl-72">
      <div className="pl-12 lg:pl-0 flex items-center gap-3 min-w-0">
        <UserAvatar src={userImage} name={userName} size="sm" />
        <div className="min-w-0">
          <p className="text-sm text-zinc-500">Willkommen zurück</p>
          <p className="font-semibold text-white truncate">{userName ?? "Athlet"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Benachrichtigungen">
          <Bell className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </Button>
      </div>
    </header>
  );
}
