"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { getCached, setCached } from "@/lib/client-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";

export type ProfilePrefetch = {
  user?: { name?: string | null; image?: string | null };
};

const ProfileDataContext = createContext<ProfilePrefetch | null>(null);

function seedProfileCache(initial: ProfilePrefetch | null) {
  if (!initial?.user) return;
  const prev = getCached<ProfilePrefetch>(PROFILE_CACHE_KEY);
  setCached(
    PROFILE_CACHE_KEY,
    { ...prev, user: { ...prev?.user, ...initial.user } },
    120_000
  );
}

export function ProfileDataProvider({
  initialProfile,
  children,
}: {
  initialProfile: ProfilePrefetch | null;
  children: ReactNode;
}) {
  const [profile] = useState(() => {
    const cached = getCached<ProfilePrefetch>(PROFILE_CACHE_KEY);
    if (cached?.user?.name) return cached;
    if (initialProfile?.user?.name || initialProfile?.user?.image) {
      seedProfileCache(initialProfile);
      return initialProfile;
    }
    return initialProfile;
  });

  return (
    <ProfileDataContext.Provider value={profile}>{children}</ProfileDataContext.Provider>
  );
}

export function usePrefetchedProfile(): ProfilePrefetch | null {
  return useContext(ProfileDataContext);
}
