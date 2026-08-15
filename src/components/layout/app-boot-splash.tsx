"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

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
 * Boot splash ONLY on cold start. Never on menu switches.
 * Auth pages dismiss immediately. App pages wait for session resolve (no fake delay).
 */
export function AppBootSplash() {
  const { status } = useSession();
  const pathname = usePathname() ?? "";
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

    const isAuthSurface =
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/reset-password") ||
      pathname.startsWith("/verify-email");

    if (isAuthSurface || status !== "loading") {
      dismissBoot();
      setDone(true);
    }
  }, [status, pathname, done]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      dismissBoot();
      setDone(true);
    }, 3500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
