import type { Metadata } from "next";
import { workoutsMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = workoutsMetadata;

export default function WorkoutsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
