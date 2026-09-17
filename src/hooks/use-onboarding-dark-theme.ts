"use client";

import { useEffect } from "react";

/**
 * Forces a premium dark first-setup surface while onboarding/register runs.
 * Restores previous html attributes on unmount so the user's theme returns.
 */
export function useOnboardingDarkTheme(active = true) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const root = document.documentElement;
    const prevOnboarding = root.getAttribute("data-onboarding");
    const prevColorMode = root.getAttribute("data-color-mode");
    const prevClass = root.className;

    root.setAttribute("data-onboarding", "true");
    root.setAttribute("data-color-mode", "dark");
    root.classList.add("dark");
    root.classList.remove("light");

    return () => {
      if (prevOnboarding == null) root.removeAttribute("data-onboarding");
      else root.setAttribute("data-onboarding", prevOnboarding);

      if (prevColorMode == null) root.removeAttribute("data-color-mode");
      else root.setAttribute("data-color-mode", prevColorMode);

      root.className = prevClass;
    };
  }, [active]);
}
