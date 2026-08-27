import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mehr",
};

export default function MoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
