import type { ReactNode } from "react";
import { AppClientShell } from "@/components/layout/app-client-shell";

/**
 * Authenticated app shell. Home paints from client cache immediately;
 * bootstrap refreshes in the background — no splash / loading gate.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppClientShell>{children}</AppClientShell>;
}
