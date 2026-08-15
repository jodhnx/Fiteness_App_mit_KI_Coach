import { Suspense, type ReactNode } from "react";
import { auth } from "@/lib/auth";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadProfilePrefetch } from "@/lib/profile-prefetch";
import { AppShell } from "@/components/layout/app-shell";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { startOfDay } from "date-fns";

/**
 * Fast shell first — profile/nutrition prefetch streams in via Suspense
 * so the user never stares at a blank black frame waiting on DB.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <ProfileDataProvider initialProfile={null}>
          <NutritionDataProvider initialDashboard={null}>
            <HomeDataProvider initialHome={null}>
              <AppShell>{children}</AppShell>
            </HomeDataProvider>
          </NutritionDataProvider>
        </ProfileDataProvider>
      }
    >
      <AppLayoutWithData>{children}</AppLayoutWithData>
    </Suspense>
  );
}

async function AppLayoutWithData({ children }: { children: ReactNode }) {
  const session = await auth();
  let initialDashboard = null;
  let initialProfile = null;

  if (session?.user?.id) {
    // Parallel, but don't fail the shell if one is slow
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
