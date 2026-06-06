import { auth } from "@/lib/auth";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { AppShell } from "@/components/layout/app-shell";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { startOfDay } from "date-fns";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialDashboard = null;
  const session = await auth();

  if (session?.user?.id) {
    try {
      initialDashboard = await loadNutritionDashboard(
        session.user.id,
        startOfDay(new Date())
      );
    } catch (e) {
      console.error("[app/layout] nutrition prefetch failed", e);
    }
  }

  return (
    <NutritionDataProvider initialDashboard={initialDashboard}>
      <AppShell>{children}</AppShell>
    </NutritionDataProvider>
  );
}
