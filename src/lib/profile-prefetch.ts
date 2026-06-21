import { prisma } from "@/lib/prisma";
import { loadCaloriePlanContext } from "@/lib/calorie-health-context";
import { readStoredProfileTargets } from "@/lib/profile-targets-sync";
import { computeProfileTargets } from "@/lib/calorie-target";
import { smartGoalCaloriePreview } from "@/lib/smart-goals";

export type ProfileServerPrefetch = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  profile?: Record<string, unknown> | null;
  onboardingCompleted?: boolean;
  calculations?: {
    bmi: number;
    calorieTarget: number;
    proteinTargetG: number;
    carbsTargetG: number;
    fatTargetG: number;
    recommendedTrainingDays: number;
  } | null;
  smartGoal?: { weightProjection?: string } | null;
};

/** Full profile snapshot from DB — seeds client cache; not a substitute for /api/profile. */
export async function loadProfilePrefetch(
  userId: string
): Promise<ProfileServerPrefetch | null> {
  try {
    const [profile, user, calorieContext] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          image: true,
          onboardingCompletedAt: true,
        },
      }),
      loadCaloriePlanContext(userId),
    ]);

    if (!user && !profile) return null;

    const calculations =
      readStoredProfileTargets(profile) ??
      (profile ? computeProfileTargets(profile, calorieContext) : null);

    return {
      user: user
        ? { name: user.name, email: user.email, image: user.image }
        : undefined,
      profile: profile as Record<string, unknown> | null,
      onboardingCompleted: Boolean(user?.onboardingCompletedAt),
      calculations: calculations ?? null,
      smartGoal: profile ? smartGoalCaloriePreview(profile) : null,
    };
  } catch (e) {
    console.error("[profile-prefetch]", e);
    return null;
  }
}
