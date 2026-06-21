import { auth } from "@/lib/auth";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadProfilePrefetch } from "@/lib/profile-prefetch";
import { loadHomeData } from "@/lib/home-data";
import { AppShell } from "@/components/layout/app-shell";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { startOfDay } from "date-fns";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialDashboard = null;
  let initialProfile = null;
  let initialHome = null;
  const session = await auth();

  if (session?.user?.id) {
    const [dashboard, profile, home] = await Promise.all([
      loadNutritionDashboard(session.user.id, startOfDay(new Date())).catch((e) => {
        console.error("[app/layout] nutrition prefetch failed", e);
        return null;
      }),
      loadProfilePrefetch(session.user.id),
      loadHomeData(session.user.id).catch((e) => {
        console.error("[app/layout] home prefetch failed", e);
        return null;
      }),
    ]);
    initialDashboard = dashboard;
    initialProfile = profile;
    initialHome = home;
  }

  return (
    <ProfileDataProvider initialProfile={initialProfile}>
      <NutritionDataProvider initialDashboard={initialDashboard}>
        <HomeDataProvider initialHome={initialHome}>
          <AppShell>{children}</AppShell>
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
