import { prisma } from "@/lib/prisma";
import type { ProfilePrefetch } from "@/components/providers/profile-data-provider";

export async function loadProfilePrefetch(userId: string): Promise<ProfilePrefetch | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, image: true },
    });
    if (!user?.name && !user?.image) return null;
    return { user: { name: user.name, image: user.image } };
  } catch (e) {
    console.error("[profile-prefetch]", e);
    return null;
  }
}
