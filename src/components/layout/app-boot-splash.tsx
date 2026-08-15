"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const BOOT_DONE_KEY = "nexform:boot-done";

/**
 * Removes the HTML boot splash once — only on cold app start.
 * Never re-shows on menu switches. No artificial delay beyond a short fade.
 */
export function AppBootSplash() {
  const { status } = useSession();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already finished boot in this tab — never show again
    try {
      if (sessionStorage.getItem(BOOT_DONE_KEY) === "1") {
        const el = document.getElementById("nexform-boot");
        el?.remove();
        document.documentElement.classList.add("nexform-booted");
        setHidden(true);
        return;
      }
    } catch {
      /* ignore */
    }

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
      try {
        sessionStorage.setItem(BOOT_DONE_KEY, "1");
      } catch {
        /* ignore */
      }
      setHidden(true);
      return;
    }

    el.classList.add("nexform-boot-hide");
    const t = window.setTimeout(() => {
      el.remove();
      setHidden(true);
      document.documentElement.classList.add("nexform-booted");
      try {
        sessionStorage.setItem(BOOT_DONE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, 180);
    return () => window.clearTimeout(t);
  }, [status, pathname]);

  // Safety: never leave splash forever
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = document.getElementById("nexform-boot");
      if (el) {
        el.classList.add("nexform-boot-hide");
        window.setTimeout(() => el.remove(), 180);
      }
      document.documentElement.classList.add("nexform-booted");
      try {
        sessionStorage.setItem(BOOT_DONE_KEY, "1");
      } catch {
        /* ignore */
      }
      setHidden(true);
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);

  if (hidden) return null;
  return null;
}
