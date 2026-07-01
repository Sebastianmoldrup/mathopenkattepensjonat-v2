import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignUpWizard } from "@/components/auth/signup-wizard";

async function SignUpGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_completed")
      .eq("id", user.id)
      .single();

    if (profile?.is_completed) redirect("/minside");
    return <SignUpWizard initialStep="profile" />;
  }

  return <SignUpWizard initialStep="credentials" />;
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={<SignUpWizard initialStep="credentials" />}>
          <SignUpGate />
        </Suspense>
      </div>
    </div>
  );
}
