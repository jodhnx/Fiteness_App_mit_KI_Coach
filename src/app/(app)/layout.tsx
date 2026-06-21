import { auth } from "@/lib/auth";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadProfilePrefetch } from "@/lib/profile-prefetch";
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
  const session = await auth();

  if (session?.user?.id) {
    const [dashboard, profile] = await Promise.all([
      loadNutritionDashboard(session.user.id, startOfDay(new Date())).catch((e) => {
        console.error("[app/layout] nutrition prefetch failed", e);
        return null;
      }),
      loadProfilePrefetch(session.user.id),
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
