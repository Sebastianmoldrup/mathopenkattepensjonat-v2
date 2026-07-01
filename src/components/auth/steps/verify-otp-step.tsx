import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth/errors";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyOtpStep({
  email,
  onSuccess,
  onBack,
}: {
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const supabase = createClient();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown === 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const verify = async (token: string) => {
    if (isVerifying) return;
    setError(null);
    setIsVerifying(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    setIsVerifying(false);

    if (error) {
      setError(getAuthErrorMessage(error));
      return;
    }

    onSuccess();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(val);
    if (val.length === 6) verify(val);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (code.length === 6) verify(code);
  };

  const handleResend = async () => {
    setError(null);
    setResendMessage(null);
    setIsResending(true);

    const { error } = await supabase.auth.resend({ type: "signup", email });

    setIsResending(false);

    if (error) {
      setError(getAuthErrorMessage(error));
      return;
    }

    setResendMessage("Ny kode sendt.");
    setCooldown(60);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Bekreft e-post</CardTitle>
        <CardDescription>Vi har sendt en kode til {email}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="code">Kode</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                aria-invalid={!!error}
                aria-describedby={error ? "otp-error" : undefined}
              />
            </div>

            {error && (
              <p id="otp-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {resendMessage && (
              <p className="text-sm text-muted-foreground">{resendMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || code.length !== 6}
            >
              {isVerifying ? "Bekrefter..." : "Bekreft"}
            </Button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={onBack}
                className="underline underline-offset-4"
              >
                Tilbake
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="underline underline-offset-4 disabled:opacity-50 disabled:no-underline"
              >
                {isResending
                  ? "Sender..."
                  : cooldown > 0
                    ? `Send ny kode (${cooldown}s)`
                    : "Send ny kode"}
              </button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
