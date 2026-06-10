import type { Metadata } from "next";
import { settingsMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = settingsMetadata;

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
