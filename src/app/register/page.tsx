"use client";

import { Suspense } from "react";
import { RegistrationFlow } from "@/components/onboarding/registration-flow";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegistrationFlow />
    </Suspense>
  );
}
