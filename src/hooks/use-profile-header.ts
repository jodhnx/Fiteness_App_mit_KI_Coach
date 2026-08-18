"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getCached, isCacheStale, setCached } from "@/lib/client-cache";
import { usePrefetchedProfile } from "@/components/providers/profile-data-provider";
import { HOME_DATA_CACHE_KEY, PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";

type ProfileCache = {
  user?: { name?: string | null; image?: string | null };
};

function readHeaderFromCaches(): { name: string | null; image: string | null } {
  const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
  const profile = getCached<ProfileCache>(PROFILE_CACHE_KEY, { allowStale: true });
  return {
    name: home?.userName ?? profile?.user?.name ?? null,
    image: home?.userImage ?? profile?.user?.image ?? null,
  };
}

/**
 * Avatar/name from home + profile cache — no visible header flash on boot.
 */
export function useProfileHeader() {
  const { data: session, status } = useSession();
  const prefetched = usePrefetchedProfile();
  const [name, setName] = useState<string | null>(() => {
    const fromCache = readHeaderFromCaches();
    return fromCache.name ?? prefetched?.user?.name ?? null;
  });
  const [image, setImage] = useState<string | null>(() => {
    const fromCache = readHeaderFromCaches();
    return fromCache.image ?? prefetched?.user?.image ?? null;
  });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const fromCache = readHeaderFromCaches();
    if (fromCache.name) setName(fromCache.name);
    if (fromCache.image) setImage(fromCache.image);

    if (prefetched?.user?.name) setName(prefetched.user.name);
    if (prefetched?.user?.image) setImage(prefetched.user.image);

    const cached = getCached<ProfileCache>(PROFILE_CACHE_KEY);
    if (cached?.user) {
      if (cached.user.name) setName(cached.user.name);
      setImage(cached.user.image ?? null);
    }

    if (!isCacheStale(PROFILE_CACHE_KEY, 0.92)) return;

    let cancelled = false;
    void fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileCache | null) => {
        if (cancelled || !data?.user) return;
        if (data.user.name) setName(data.user.name);
        setImage(data.user.image ?? null);
        const prev = getCached<Record<string, unknown>>(PROFILE_CACHE_KEY);
        setCached(
          PROFILE_CACHE_KEY,
          { ...prev, ...data, user: { ...(prev?.user as object), ...data.user } },
          900_000
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, prefetched?.user?.name, prefetched?.user?.image]);

  return { name, image };
}
