"use client";

import { useSession } from "next-auth/react";
import { useProfileHeader } from "@/hooks/use-profile-header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { AppScrollMain } from "@/components/layout/app-scroll-main";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { GuestUpgradeBanner } from "@/components/auth/guest-upgrade-banner";
import { SidebarProvider } from "@/components/layout/sidebar-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { name: headerName, image: headerImage } = useProfileHeader();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <SidebarProvider>
      <NotificationProvider>
        <div className="app-viewport gradient-mesh">
          <RoutePrefetcher />
          <SidebarNav isAdmin={isAdmin} />
          <div className="mobile-app-frame mx-auto flex h-full w-full max-w-[430px] flex-col">
            <Header userName={headerName} userImage={headerImage} />
            <AppScrollMain>
              <GuestUpgradeBanner />
              {children}
            </AppScrollMain>
          </div>
          <BottomNav />
          <NotificationCenter />
          <GamificationUnlockToast />
        </div>
      </NotificationProvider>
    </SidebarProvider>
  );
}
