"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useProfileHeader } from "@/hooks/use-profile-header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { HomeCompactHeader } from "@/components/home/home-compact-header";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { SidebarProvider } from "@/components/layout/sidebar-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/home";
  const { data: session } = useSession();
  const { name: headerName, image: headerImage } = useProfileHeader();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <SidebarProvider>
      <div className="gradient-mesh min-h-[100dvh]">
        <RoutePrefetcher />
        <SidebarNav isAdmin={isAdmin} />
        <div className="mobile-app-frame mx-auto w-full min-h-[100dvh] flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
          {isHome ? (
            <HomeCompactHeader name={headerName} image={headerImage} />
          ) : (
            <Header userName={headerName} userImage={headerImage} />
          )}
          <main className="app-page-content flex-1 px-4 pb-4">{children}</main>
        </div>
        <BottomNav />
        <GamificationUnlockToast />
      </div>
    </SidebarProvider>
  );
}
