"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const pathname = usePathname();
  const isHome = pathname === "/home" || pathname === "/dashboard";
  const isCoach = pathname === "/coach" || pathname.startsWith("/coach/");

  return (
    <div className="gradient-mesh min-h-[100dvh]">
      <RoutePrefetcher />
      <SidebarNav isAdmin={isAdmin} />
      <div className="lg:pl-64 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="hidden lg:block">
          <Header userName={session?.user?.name} userImage={session?.user?.image} />
        </div>
        <main
          className={cn(
            "mobile-app-frame mx-auto w-full px-4 pt-3",
            isHome ? "pt-2" : "sm:pt-4",
            isCoach ? "pb-2" : "pb-2 sm:pb-4"
          )}
        >
          {children}
        </main>
      </div>
      <BottomNav />
      <GamificationUnlockToast />
    </div>
  );
}
