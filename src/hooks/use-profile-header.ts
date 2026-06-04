"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getCached } from "@/lib/client-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";

type ProfileCache = {
  user?: { name?: string | null; image?: string | null };
};

/**
 * Avatar/name from API cache — never from JWT (avoids huge session cookies).
 */
export function useProfileHeader() {
  const { data: session, status } = useSession();
  const [name, setName] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setName(null);
      setImage(null);
      return;
    }

    const cached = getCached<ProfileCache>(PROFILE_CACHE_KEY);
    if (cached?.user) {
      setName(cached.user.name ?? null);
      setImage(cached.user.image ?? null);
    }

    const emailLabel = session.user.email?.split("@")[0] ?? null;
    if (!cached?.user?.name) setName(emailLabel);

    let cancelled = false;
    void fetch("/api/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileCache | null) => {
        if (cancelled || !data?.user) return;
        setName(data.user.name ?? emailLabel);
        setImage(data.user.image ?? null);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.id, session?.user?.email]);

  return {
    name: name ?? session?.user?.email?.split("@")[0] ?? null,
    image,
  };
}
