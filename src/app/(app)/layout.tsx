import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadProfilePrefetch } from "@/lib/profile-prefetch";
import { AppShell } from "@/components/layout/app-shell";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { startOfDay } from "date-fns";

/**
 * Single AppShell tree — never remount via Suspense fallback (that caused
 * client-side crashes when switching menus). Prefetch is best-effort parallel.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  let initialDashboard = null;
  let initialProfile = null;

  try {
    const session = await auth();
    if (session?.user?.id) {
      const [dashboard, profile] = await Promise.all([
        loadNutritionDashboard(session.user.id, startOfDay(new Date())).catch((e) => {
          console.error("[app/layout] nutrition prefetch failed", e);
          return null;
        }),
        loadProfilePrefetch(session.user.id).catch((e) => {
          console.error("[app/layout] profile prefetch failed", e);
          return null;
        }),
      ]);
      initialDashboard = dashboard;
      initialProfile = profile;
    }
  } catch (e) {
    console.error("[app/layout] auth/prefetch failed", e);
  }

  return (
    <ProfileDataProvider initialProfile={initialProfile}>
      <NutritionDataProvider initialDashboard={initialDashboard}>
        <HomeDataProvider initialHome={null}>
          <AppShell>{children}</AppShell>
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
