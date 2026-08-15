"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

/**
 * Removes the HTML boot splash as soon as the client is interactive.
 * Does not add artificial delay — only covers real init (session + first paint).
 */
export function AppBootSplash() {
  const { status } = useSession();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Public/auth pages: drop splash immediately after mount
    const isAuthSurface =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/verify-email");

    const ready = isAuthSurface || status !== "loading";

    if (!ready) return;

    const el = document.getElementById("nexform-boot");
    if (!el) {
      setHidden(true);
      return;
    }

    el.classList.add("nexform-boot-hide");
    const t = window.setTimeout(() => {
      el.remove();
      setHidden(true);
      document.documentElement.classList.add("nexform-booted");
    }, 220);
    return () => window.clearTimeout(t);
  }, [status, pathname]);

  // Safety: never leave splash forever (e.g. session hang)
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = document.getElementById("nexform-boot");
      if (el) {
        el.classList.add("nexform-boot-hide");
        window.setTimeout(() => el.remove(), 200);
      }
      document.documentElement.classList.add("nexform-booted");
      setHidden(true);
    }, 4500);
    return () => window.clearTimeout(t);
  }, []);

  if (hidden) return null;
  return null;
}
