import type { Metadata } from "next";
import { coachMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = coachMetadata;

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return children;
}
