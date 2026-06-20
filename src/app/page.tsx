import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PremiumLanding } from "@/components/landing/premium-landing";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");
  return <PremiumLanding />;
}
