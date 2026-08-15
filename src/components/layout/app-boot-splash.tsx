"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const BOOT_DONE_KEY = "nexform:boot-done";

function dismissBoot() {
  const el = document.getElementById("nexform-boot");
  if (el) {
    el.classList.add("nexform-boot-hide");
    window.setTimeout(() => el.remove(), 160);
  }
  document.documentElement.classList.add("nexform-booted");
  try {
    sessionStorage.setItem(BOOT_DONE_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Boot splash ONLY on cold start. Uses window.location (not usePathname)
 * to avoid router coupling in the root layout tree.
 */
export function AppBootSplash() {
  const { status } = useSession();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;

    try {
      if (sessionStorage.getItem(BOOT_DONE_KEY) === "1") {
        dismissBoot();
        setDone(true);
        return;
      }
    } catch {
      /* ignore */
    }

    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const isAuthSurface =
      path === "/" ||
      path.startsWith("/login") ||
      path.startsWith("/register") ||
      path.startsWith("/reset-password") ||
      path.startsWith("/verify-email");

    if (isAuthSurface || status !== "loading") {
      dismissBoot();
      setDone(true);
    }
  }, [status, done]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      dismissBoot();
      setDone(true);
    }, 3500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
