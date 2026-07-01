"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const COOLDOWN_SECONDS = 60;

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const supabase = createClient();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || status === "sending") return;
    setStatus("sending");

    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      setStatus("error");
      return;
    }

    setStatus("sent");
    setCooldown(COOLDOWN_SECONDS);
  };

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Sjekk innboksen din</CardTitle>
        <CardDescription>
          {email ? (
            <>
              Vi har sendt en bekreftelseslenke til{" "}
              <span className="font-medium text-foreground">{email}</span>
            </>
          ) : (
            "Vi har sendt deg en bekreftelseslenke på e-post"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          Klikk på lenken i e-posten for å bekrefte kontoen din. Husk å sjekke
          søppelpostmappen hvis du ikke finner den.
        </p>

        {status === "sent" && (
          <p className="text-center text-sm text-green-600 dark:text-green-400">
            En ny bekreftelseslenke er sendt.
          </p>
        )}

        {status === "error" && (
          <p className="text-center text-sm text-destructive">
            Kunne ikke sende e-post på nytt. Prøv igjen om litt.
          </p>
        )}

        {email && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0 || status === "sending"}
          >
            {status === "sending"
              ? "Sender..."
              : cooldown > 0
                ? `Send på nytt om ${cooldown}s`
                : "Send bekreftelseslenke på nytt"}
          </Button>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Feil e-postadresse?{" "}
          <Link
            href="/registrering"
            className="text-foreground underline underline-offset-4"
          >
            Gå tilbake
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <CheckEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
