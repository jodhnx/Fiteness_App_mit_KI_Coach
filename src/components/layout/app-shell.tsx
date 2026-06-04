"use client";

import { useSession } from "next-auth/react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <div className="gradient-mesh min-h-screen">
      <RoutePrefetcher />
      <SidebarNav isAdmin={isAdmin} />
      <div className="lg:pl-64 pb-20 lg:pb-0">
        <Header userName={session?.user?.name} userImage={session?.user?.image} />
        <main className="p-4 sm:p-6 max-w-3xl lg:max-w-4xl mx-auto">{children}</main>
      </div>
      <BottomNav />
      <GamificationUnlockToast />
    </div>
  );
}
