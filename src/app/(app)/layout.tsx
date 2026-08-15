import type { ReactNode } from "react";
import { AppClientShell } from "@/components/layout/app-client-shell";

/**
 * Thin server layout — no per-navigation DB prefetch.
 * Prefetch used to re-pass new props on every menu switch, which re-ran
 * provider effects inside the layout tree and crashed into global-error.
 * Data is loaded once client-side in AppClientShell after auth is ready.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppClientShell>{children}</AppClientShell>;
}
