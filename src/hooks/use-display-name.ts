"use client";

import { usePrefetchedProfile } from "@/components/providers/profile-data-provider";
import { getCached } from "@/lib/client-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";

type ProfileCache = {
  user?: { name?: string | null };
};

/** Real display name from registration/settings — never email or placeholders. */
export function useDisplayName(homeUserName?: string | null): string | null {
  const prefetched = usePrefetchedProfile();
  const cached = getCached<ProfileCache>(PROFILE_CACHE_KEY);

  const candidates = [
    prefetched?.user?.name,
    cached?.user?.name,
    homeUserName,
  ];

  for (const c of candidates) {
    const trimmed = c?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}
