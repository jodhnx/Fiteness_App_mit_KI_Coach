import { prisma } from "@/lib/prisma";
import { getUserTotalXP } from "@/lib/gamification";
import { getLevelFromXP } from "@/lib/level-system";
import { loadAchievementsWithProgress } from "@/lib/achievement-engine";
import { loadChallengesWithProgress } from "@/lib/challenge-progress";
import {
  createEmptyGamificationPayload,
  type GamificationApiPayload,
} from "@/lib/gamification-defaults";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

const EVALUATE_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)
    ),
  ]);
}

/** Full gamification payload — never throws; returns empty defaults on failure */
export async function loadGamificationPayload(
  userId: string,
  options?: { runUnlockCheck?: boolean }
): Promise<GamificationApiPayload> {
  const errors: string[] = [];

  if (options?.runUnlockCheck) {
    void import("@/lib/achievement-engine")
      .then(({ evaluateAndUnlockAchievements }) =>
        withTimeout(evaluateAndUnlockAchievements(userId), EVALUATE_TIMEOUT_MS, "evaluate")
      )
      .catch((e) => console.warn("[gamification] unlock check skipped", e));
  }

  let totalXP = 0;
  try {
    totalXP = await getUserTotalXP(userId);
  } catch (e) {
    console.error("[gamification] getUserTotalXP", e);
    errors.push("XP");
  }

  const level = getLevelFromXP(totalXP);

  const [achievements, challenges, streak, xpHistory] = await Promise.all([
    loadAchievementsWithProgress(userId).catch((e) => {
      console.error("[gamification] achievements", e);
      if (isSchemaMismatchError(e)) {
        errors.push("Achievement-Tabelle/Spalte fehlt (db push)");
      } else {
        errors.push("Erfolge");
      }
      return [];
    }),
    loadChallengesWithProgress(userId, { syncDb: true }).catch((e) => {
      console.error("[gamification] challenges", e);
      if (isSchemaMismatchError(e)) {
        errors.push("Challenge-Tabelle/Spalte fehlt (db push)");
      } else {
        errors.push("Challenges");
      }
      return [];
    }),
    prisma.streak
      .findUnique({ where: { userId } })
      .catch((e) => {
        console.error("[gamification] streak", e);
        return null;
      }),
    prisma.xPTransaction
      .findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
      .catch((e) => {
        console.error("[gamification] xpHistory", e);
        errors.push("XP-Historie");
        return [];
      }),
  ]);

  const unlockedCount = achievements.filter((a) => a.earned).length;
  const totalAchievements = achievements.length;

  const latest = achievements
    .filter((a) => a.earned && a.earnedAt)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))[0];

  const activeChallenges = challenges.filter((c) => c.status !== "COMPLETED");
  const activeChallenge = activeChallenges.sort(
    (a, b) => b.progress / Math.max(1, b.targetDays) - a.progress / Math.max(1, a.targetDays)
  )[0];

  const open = achievements
    .filter((a) => !a.earned)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];

  let nearestAchievement: GamificationApiPayload["summary"]["nearestAchievement"] = null;
  if (open) {
    const approxCurrent = Math.floor((open.progressPercent / 100) * open.targetValue);
    nearestAchievement = {
      name: open.name,
      remaining: Math.max(0, open.targetValue - approxCurrent),
      progressLabel: `${approxCurrent} / ${open.targetValue}`,
    };
  }

  const summary = {
    totalXP,
    level,
    unlockedCount,
    totalAchievements,
    latestAchievement: latest
      ? { name: latest.name, icon: latest.icon, tier: latest.tier }
      : null,
    activeChallenge: activeChallenge
      ? {
          title: activeChallenge.title,
          progress: activeChallenge.progress,
          target: activeChallenge.targetDays,
          tier: activeChallenge.tier,
        }
      : null,
    nearestAchievement,
  };

  const payload: GamificationApiPayload = {
    totalXP,
    level,
    summary,
    achievements,
    challenges,
    streak: streak
      ? { currentDays: streak.currentDays, longestDays: streak.longestDays }
      : null,
    xpHistory: xpHistory.map((x) => ({
      amount: x.amount,
      reason: x.reason,
      createdAt: x.createdAt.toISOString(),
    })),
    unlockedCount,
    totalAchievements,
    ...(errors.length > 0
      ? { _degraded: true, _error: errors.join("; ") }
      : {}),
  };

  return payload;
}

export function degradedPayload(message: string): GamificationApiPayload {
  return createEmptyGamificationPayload({
    _degraded: true,
    _error: message,
  });
}
