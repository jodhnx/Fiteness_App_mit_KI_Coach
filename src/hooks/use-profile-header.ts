"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getCached, setCached } from "@/lib/client-cache";
import { usePrefetchedProfile } from "@/components/providers/profile-data-provider";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";

type ProfileCache = {
  user?: { name?: string | null; image?: string | null };
};

/**
 * Avatar/name from API cache — never from JWT (avoids huge session cookies).
 */
export function useProfileHeader() {
  const { data: session, status } = useSession();
  const prefetched = usePrefetchedProfile();
  const [name, setName] = useState<string | null>(() => {
    const cached = getCached<ProfileCache>(PROFILE_CACHE_KEY);
    return cached?.user?.name ?? prefetched?.user?.name ?? null;
  });
  const [image, setImage] = useState<string | null>(() => {
    const cached = getCached<ProfileCache>(PROFILE_CACHE_KEY);
    return cached?.user?.image ?? prefetched?.user?.image ?? null;
  });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setName(null);
      setImage(null);
      return;
    }

    if (prefetched?.user?.name) setName(prefetched.user.name);
    if (prefetched?.user?.image) setImage(prefetched.user.image);

    const cached = getCached<ProfileCache>(PROFILE_CACHE_KEY);
    if (cached?.user) {
      if (cached.user.name) setName(cached.user.name);
      setImage(cached.user.image ?? null);
    }

    let cancelled = false;
    void fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileCache | null) => {
        if (cancelled || !data?.user) return;
        if (data.user.name) setName(data.user.name);
        setImage(data.user.image ?? null);
        if (data.user.name || data.user.image) {
          const prev = getCached<ProfileCache>(PROFILE_CACHE_KEY);
          setCached(
            PROFILE_CACHE_KEY,
            { ...prev, user: { ...prev?.user, ...data.user } },
            120_000
          );
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, prefetched?.user?.name, prefetched?.user?.image]);

  return { name, image };
}
