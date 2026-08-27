"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useProfileHeader } from "@/hooks/use-profile-header";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { ProfileDashboardPanel } from "@/components/layout/profile-dashboard-panel";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { GamificationUnlockToast } from "@/components/gamification/gamification-unlock-toast";
import { RoutePrefetcher } from "@/components/layout/route-prefetcher";
import { GuestUpgradeBanner } from "@/components/auth/guest-upgrade-banner";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { SessionCacheGuard } from "@/components/providers/session-cache-guard";
import { PhoneSensorWarmup } from "@/components/health/phone-sensor-warmup";
import { MealReminderWarmup } from "@/components/nutrition/meal-reminder-warmup";
import { FeatureTour } from "@/components/guide/feature-tour";
import { PersistentTabProvider, TabKeepAliveOutlet } from "@/components/layout/persistent-tab-provider";
import { TabSwipeLayer } from "@/components/layout/tab-swipe-layer";
import { AppErrorBoundary } from "@/components/layout/app-error-boundary";
import { cn } from "@/lib/utils";

function isImmersiveRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.includes("/workouts/live/") ||
    pathname.includes("/nutrition/add/") ||
    pathname.includes("/workouts/exercises/pick")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { name: headerName, image: headerImage } = useProfileHeader();
  const isAdmin = session?.user?.role === "ADMIN";
  const pathname = usePathname();
  const immersive = isImmersiveRoute(pathname);

  return (
    <SidebarProvider>
      <NotificationProvider>
        <SessionCacheGuard />
        <PhoneSensorWarmup />
        <MealReminderWarmup />
        <PersistentTabProvider>
          <div className="gradient-mesh min-h-[100dvh] overflow-x-hidden lg:flex">
            <DesktopNav />
            <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh]">
            <RoutePrefetcher />
            <div
              className={cn(
                "mobile-app-frame mx-auto w-full min-h-[100dvh] flex flex-col lg:max-w-3xl",
                !immersive && "pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-4"
              )}
            >
              {!immersive && (
                <AppErrorBoundary label="header">
                  <Header userName={headerName} userImage={headerImage} />
                </AppErrorBoundary>
              )}
              <main
                className={cn(
                  "app-page-content flex-1 min-w-0",
                  immersive ? "px-3 pb-4 pt-2" : "px-4 pb-4"
                )}
              >
                <GuestUpgradeBanner />
                <TabSwipeLayer>
                  <TabKeepAliveOutlet>{children}</TabKeepAliveOutlet>
                </TabSwipeLayer>
              </main>
            </div>
            <AppErrorBoundary label="nav">
              <BottomNav />
            </AppErrorBoundary>
            <AppErrorBoundary label="profile">
              <ProfileDashboardPanel
                userName={headerName}
                userImage={headerImage}
                isAdmin={isAdmin}
              />
            </AppErrorBoundary>
            <AppErrorBoundary label="overlays">
              <NotificationCenter />
              <GamificationUnlockToast />
              <FeatureTour />
            </AppErrorBoundary>
            </div>
          </div>
        </PersistentTabProvider>
      </NotificationProvider>
    </SidebarProvider>
  );
}
