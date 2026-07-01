import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "./navbar";
import type { NavRole } from "@/lib/nav-links";

async function NavbarInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: NavRole = "guest";

  if (user) {
    role = "user";
    // Check admin first — is_staff() may or may not return true for admins
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin) {
      role = "admin";
    } else {
      const { data: isStaff } = await supabase.rpc("is_staff");
      if (isStaff) role = "staff";
    }
  }

  return <Navbar role={role} />;
}

function NavbarSkeleton() {
  return <div className="sticky top-0 z-50 border-b bg-card h-28" aria-hidden="true" />;
}

export function NavbarWrapper() {
  return (
    <Suspense fallback={<NavbarSkeleton />}>
      <NavbarInner />
    </Suspense>
  );
}
