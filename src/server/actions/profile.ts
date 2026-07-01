"use server";

import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/schemas/profileSchema";
import type { z } from "zod";

export async function completeProfile(input: z.input<typeof profileSchema>) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "session_expired" as const };

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
      emergency_phone: parsed.data.emergencyPhone,
      address: parsed.data.address,
      privacy_accepted_at: new Date().toISOString(),
      is_completed: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  return { success: true as const };
}
