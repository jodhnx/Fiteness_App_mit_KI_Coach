"use client";

import { useSession } from "next-auth/react";
import { useProfileHeader } from "@/hooks/use-profile-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { ProfileDashboardPanel } from "@/components/layout/profile-dashboard-panel";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { GuestUpgradeBanner } from "@/components/auth/guest-upgrade-banner";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { name: headerName, image: headerImage } = useProfileHeader();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <SidebarProvider>
      <NotificationProvider>
        <ServiceWorkerProvider />
        <div className="gradient-mesh min-h-[100dvh]">
          <RoutePrefetcher />
          <div className="mobile-app-frame mx-auto w-full min-h-[100dvh] flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
            <Header userName={headerName} userImage={headerImage} />
            <main className="app-page-content flex-1 px-4 pb-4 view-transition-page">
              <GuestUpgradeBanner />
              {children}
            </main>
          </div>
          <BottomNav />
          <ProfileDashboardPanel
            userName={headerName}
            userImage={headerImage}
            isAdmin={isAdmin}
          />
          <NotificationCenter />
          <GamificationUnlockToast />
        </div>
      </NotificationProvider>
    </SidebarProvider>
  );
}
