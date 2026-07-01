"use client";

import { useState } from "react";
import { EmailPasswordStep } from "./steps/email-password-step";
import { ProfileStep } from "./steps/profile-step";

type Step = "credentials" | "profile";

export function SignUpWizard({ initialStep = "credentials" }: { initialStep?: Step }) {
  const [step, setStep] = useState<Step>(initialStep);

  return (
    <div className="flex flex-col gap-6">
      {step === "credentials" && (
        <EmailPasswordStep onSuccess={() => setStep("profile")} />
      )}
      {step === "profile" && <ProfileStep />}
    </div>
  );
}
