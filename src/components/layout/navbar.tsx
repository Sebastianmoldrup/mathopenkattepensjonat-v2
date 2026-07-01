"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PUBLIC_NAV_LINKS } from "@/lib/nav-links";
import type { NavRole } from "@/lib/nav-links";
import { signOut } from "@/server/actions/auth";

function AuthActions({
  role,
  onNavigate,
}: {
  role: NavRole;
  onNavigate?: () => void;
}) {
  if (role === "guest") {
    return (
      <Button asChild variant="default" size="sm">
        <Link href="/login" onClick={onNavigate}>
          Logg inn
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
      <Link
        href="/minside"
        onClick={onNavigate}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Min side
      </Link>
      {" | "}
      {role === "admin" && (
        <Link href="/admin" onClick={onNavigate}>
          <Badge variant="default">Admin</Badge>
        </Link>
      )}
      {role === "staff" && (
        <Link href="/staff" onClick={onNavigate}>
          <Badge variant="secondary">Personale</Badge>
        </Link>
      )}
      <form action={signOut}>
        <button
          type="submit"
          onClick={onNavigate}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Logg ut
        </button>
      </form>
    </div>
  );
}

export function Navbar({ role }: { role: NavRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="container mx-auto flex h-28 items-center justify-between px-4">
        <Link
          href="/"
          onClick={closeMenu}
          className="text-base font-semibold text-foreground whitespace-nowrap"
        >
          <Image
            src="/img/cropped.webp"
            alt="Mathopen Kattepensjonat"
            width={96}
            height={96}
            className="h-20 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Navigasjon"
        >
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={cn(
                "text-sm transition-colors",
                pathname === link.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex">
          <AuthActions role={role} />
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Åpne meny"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetTitle className="sr-only">Meny</SheetTitle>
            <nav
              className="flex flex-col gap-5 px-6 pt-10"
              aria-label="Mobilnavigasjon"
            >
              {PUBLIC_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={cn(
                    "text-base transition-colors",
                    pathname === link.href
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="px-6 mt-6 border-t pt-6">
              <AuthActions role={role} onNavigate={closeMenu} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
