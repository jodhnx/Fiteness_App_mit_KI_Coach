import type { Metadata } from "next";
import { nutritionMetadata } from "@/lib/page-metadata";

export const metadata: Metadata = nutritionMetadata;

export default function NutritionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
