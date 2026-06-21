"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCached, setCached } from "@/lib/client-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";

const ProfileDataContext = createContext<ProfileServerPrefetch | null>(null);

function seedProfileCacheFromServer(initial: ProfileServerPrefetch) {
  if (!initial.profile && !initial.user) return;
  const prev = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY);
  if (prev?.profile && !initial.profile) return;
  setCached(
    PROFILE_CACHE_KEY,
    {
      ...prev,
      ...initial,
      user: { ...prev?.user, ...initial.user },
      profile: initial.profile ?? prev?.profile,
      calculations: initial.calculations ?? prev?.calculations,
    },
    120_000
  );
}

export function ProfileDataProvider({
  initialProfile,
  children,
}: {
  initialProfile: ProfileServerPrefetch | null;
  children: ReactNode;
}) {
  const [profile] = useState<ProfileServerPrefetch | null>(() => {
    const cached = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY);
    if (cached?.profile) return cached;
    if (initialProfile?.profile || initialProfile?.user) {
      seedProfileCacheFromServer(initialProfile);
      return initialProfile;
    }
    return initialProfile;
  });

  useEffect(() => {
    if (initialProfile?.profile) {
      seedProfileCacheFromServer(initialProfile);
    }
  }, [initialProfile]);

  return (
    <ProfileDataContext.Provider value={profile}>{children}</ProfileDataContext.Provider>
  );
}

export function usePrefetchedProfile(): ProfileServerPrefetch | null {
  return useContext(ProfileDataContext);
}
