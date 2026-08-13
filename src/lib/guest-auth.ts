import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma, dbQuery } from "@/lib/prisma";
import {
  trainingGoalFromMainGoalKey,
  defaultNutritionGoalForMainGoal,
  type MainGoalKey,
} from "@/lib/onboarding-options";
import { recalculateProfileTargets } from "@/lib/profile-calculations";
import type { OnboardingDraft } from "@/lib/onboarding-draft";
import { paceToTargetDate } from "@/lib/onboarding-draft";
import { GUEST_EMAIL_SUFFIX } from "@/lib/guest-utils";
import { addDays } from "date-fns";
import {
  generateVerificationCode,
  isEmailVerificationEnabled,
  verificationExpiresAt,
} from "@/lib/verification";

export { isGuestEmail, GUEST_EMAIL_SUFFIX } from "@/lib/guest-utils";

function guestPassword(): string {
  return randomBytes(24).toString("hex");
}

function buildProfileFromDraft(draft: OnboardingDraft) {
  const mainGoalKey = draft.mainGoalKey as MainGoalKey;
  const nutritionGoal = defaultNutritionGoalForMainGoal(mainGoalKey);
  const trainingGoal = trainingGoalFromMainGoalKey(mainGoalKey);
  const targetDate = paceToTargetDate(draft.pace);

  const calc = recalculateProfileTargets(
    {
      age: draft.age,
      weightKg: draft.weightKg,
      heightCm: draft.heightCm,
      gender: draft.gender,
      activityLevel: draft.activityLevel,
      trainingGoal,
      nutritionGoal,
      workoutDaysPerWeek: draft.workoutDaysPerWeek,
    },
    undefined,
    draft.targetWeightKg,
    targetDate
  );

  return {
    age: draft.age,
    weightKg: draft.weightKg,
    heightCm: draft.heightCm,
    gender: draft.gender,
    activityLevel: draft.activityLevel,
    trainingGoal,
    nutritionGoal,
    experienceLevel: draft.experienceLevel,
    workoutDaysPerWeek: draft.workoutDaysPerWeek,
    targetWeightKg: draft.targetWeightKg,
    targetWeightDate: targetDate,
    trainingLocation: draft.location ?? null,
    calorieTarget: calc.calorieTarget,
    proteinTargetG: calc.proteinTargetG,
    carbsTargetG: calc.carbsTargetG,
    fatTargetG: calc.fatTargetG,
    bmi: calc.bmi,
  };
}

export async function createGuestUser(draft?: OnboardingDraft | null) {
  const id = randomBytes(12).toString("hex");
  const email = `guest_${id}${GUEST_EMAIL_SUFFIX}`;
  const password = guestPassword();
  const passwordHash = await bcrypt.hash(password, 12);
  const name = draft?.name?.trim() || "Gast";

  const profileData = draft ? buildProfileFromDraft(draft) : null;

  const user = await dbQuery("guest.create", (db) =>
    db.user.create({
      data: {
        email,
        name,
        passwordHash,
        isGuest: true,
        emailVerified: new Date(),
        onboardingCompletedAt: profileData ? new Date() : null,
        profile: profileData ? { create: profileData } : { create: {} },
      },
      select: { id: true, email: true, name: true, isGuest: true },
    })
  );

  await dbQuery("guest.streak", (db) =>
    db.streak.upsert({
      where: { userId: user.id },
      create: { userId: user.id, currentDays: 0 },
      update: {},
    })
  );

  return { user, password };
}

export async function convertGuestToAccount(
  userId: string,
  input: { email: string; password: string; name?: string; username?: string }
) {
  const guest = await prisma.user.findUnique({
    where: { id: userId },
    select: { isGuest: true, email: true },
  });

  if (!guest?.isGuest) {
    return { ok: false as const, error: "Kein Gastkonto", status: 400 };
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing && existing.id !== userId) {
    return { ok: false as const, error: "E-Mail bereits registriert", status: 409 };
  }

  if (input.username) {
    const taken = await prisma.user.findUnique({
      where: { username: input.username },
      select: { id: true },
    });
    if (taken && taken.id !== userId) {
      return {
        ok: false as const,
        error: "Dieser Benutzername ist bereits vergeben.",
        status: 409,
      };
    }
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const verificationRequired = isEmailVerificationEnabled();
  const code = verificationRequired ? generateVerificationCode() : null;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email: input.email.toLowerCase().trim(),
      passwordHash,
      isGuest: false,
      name: input.name?.trim() || undefined,
      username: input.username || undefined,
      emailVerified: verificationRequired ? null : new Date(),
      verificationCode: code,
      verificationExpires: verificationRequired ? verificationExpiresAt() : null,
    },
  });

  return {
    ok: true as const,
    user: updated,
    needsEmailVerification: verificationRequired,
    verificationCode: code,
  };
}

/** Apply onboarding draft to an existing user profile */
export async function applyOnboardingDraft(userId: string, draft: OnboardingDraft) {
  const profileData = buildProfileFromDraft(draft);
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: draft.name.trim(),
      onboardingCompletedAt: new Date(),
    },
  });
  return profileData;
}

export function guestSessionExpiry(): Date {
  return addDays(new Date(), 90);
}
