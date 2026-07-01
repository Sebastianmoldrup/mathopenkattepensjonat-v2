import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signUpSchema } from "@/schemas/signUpSchema";
import { getAuthErrorMessage } from "@/lib/auth/errors";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormValues = z.infer<typeof signUpSchema>;

export function EmailPasswordStep({ onSuccess }: { onSuccess: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      repeatPassword: "",
      privacyAccepted: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("root", { message: getAuthErrorMessage(error) });
      return;
    }

    // Supabase returns a fake success for existing emails when email confirmation
    // is enabled to prevent enumeration. The identities array is empty in that case.
    if (signUpData.user?.identities?.length === 0) {
      setError("root", {
        message: "En konto med denne e-postadressen finnes allerede.",
      });
      return;
    }

    if (signUpData.session) {
      onSuccess();
    } else {
      router.push(`/registrering-bekreftet?email=${encodeURIComponent(data.email)}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Opprett konto</CardTitle>
        <CardDescription>
          Lag en ny brukerkonto for å bestille opphold
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-6">
            <Field>
              <FieldLabel htmlFor="email">E-post</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Passord</FieldLabel>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Skjul passord" : "Vis passord"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FieldError errors={[errors.password]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="repeatPassword">Gjenta passord</FieldLabel>
              <div className="relative">
                <Input
                  id="repeatPassword"
                  type={showRepeatPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  aria-invalid={!!errors.repeatPassword}
                  {...register("repeatPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowRepeatPassword((v) => !v)}
                  aria-label={
                    showRepeatPassword ? "Skjul passord" : "Vis passord"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showRepeatPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FieldError errors={[errors.repeatPassword]} />
            </Field>

            <Field>
              <div className="flex items-start gap-3">
                <Controller
                  control={control}
                  name="privacyAccepted"
                  render={({ field }) => (
                    <Checkbox
                      id="privacy"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={!!errors.privacyAccepted}
                      className="mt-0.5"
                    />
                  )}
                />
                <label
                  htmlFor="privacy"
                  className="text-sm font-normal leading-snug cursor-pointer"
                >
                  Jeg har lest og godtar{" "}
                  <Link
                    href="/personvern"
                    target="_blank"
                    className="underline underline-offset-4"
                  >
                    personvernerklæringen
                  </Link>{" "}
                  og{" "}
                  <Link
                    href="/vilkar"
                    target="_blank"
                    className="underline underline-offset-4"
                  >
                    vilkårene
                  </Link>
                </label>
              </div>
              <FieldError errors={[errors.privacyAccepted]} />
            </Field>

            <FieldError errors={[errors.root]} />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Oppretter konto..." : "Opprett konto"}
            </Button>
          </div>

          <div className="mt-4 text-center text-sm">
            Har du allerede en konto?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Logg inn
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
