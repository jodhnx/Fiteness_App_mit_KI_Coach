import type { Metadata } from "next";
import { progressMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = progressMetadata;

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
