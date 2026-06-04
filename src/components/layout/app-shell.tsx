"use client";

import { useSession } from "next-auth/react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { SidebarProvider } from "@/components/layout/sidebar-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <SidebarProvider>
      <div className="gradient-mesh min-h-[100dvh]">
        <RoutePrefetcher />
        <SidebarNav isAdmin={isAdmin} />
        <div className="mobile-app-frame mx-auto w-full min-h-[100dvh] flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          <Header userName={session?.user?.name} userImage={session?.user?.image} />
          <main className="flex-1 px-4 pb-4">{children}</main>
        </div>
        <BottomNav />
        <GamificationUnlockToast />
      </div>
    </SidebarProvider>
  );
}
