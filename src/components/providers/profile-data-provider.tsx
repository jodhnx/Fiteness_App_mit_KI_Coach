"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCached, setCached } from "@/lib/client-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";

const ProfileDataContext = createContext<ProfileServerPrefetch | null>(null);

function seedProfileCacheFromServer(initial: ProfileServerPrefetch) {
  if (!initial.profile && !initial.user && !initial.calculations) return;
  const prev = getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY);
  // Never keep a previous user's profile when server sent a fresh one
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
    if (initialProfile?.profile || initialProfile?.user || initialProfile?.calculations) {
      seedProfileCacheFromServer(initialProfile);
      return initialProfile;
    }
    return getCached<ProfileServerPrefetch>(PROFILE_CACHE_KEY, { allowStale: true });
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
