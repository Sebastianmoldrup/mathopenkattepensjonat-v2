import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const rawNext = searchParams.get("next") ?? "/registrering";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/registrering";

  if (!token_hash || !type) {
    redirect("/error?code=ugyldig_lenke");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    if (error.code === "otp_expired" || error.code === "token_expired") {
      redirect("/error?code=lenke_utgaatt");
    }
    redirect("/error?code=bekreftelse_feilet");
  }

  redirect(next);
}
