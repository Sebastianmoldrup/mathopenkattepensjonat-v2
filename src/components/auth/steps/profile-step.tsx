import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { profileSchema } from "@/schemas/profileSchema";
import { completeProfile } from "@/server/actions/profile";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormValues = z.infer<typeof profileSchema>;

export function ProfileStep() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      emergencyPhone: "",
      address: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    const result = await completeProfile(data);

    if ("fieldErrors" in result && result.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (message) setError(key as keyof FormValues, { message });
      }
      return;
    }

    if ("error" in result) {
      if (result.error === "session_expired") {
        router.push("/login");
        return;
      }
      setError("root", { message: "Kunne ikke lagre profilen. Prøv igjen." });
      return;
    }

    router.push("/minside");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Fullfør profilen din</CardTitle>
        <CardDescription>
          Vi trenger litt mer informasjon før du kan bestille opphold
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">Fornavn</FieldLabel>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  aria-invalid={!!errors.firstName}
                  {...register("firstName")}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Etternavn</FieldLabel>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  aria-invalid={!!errors.lastName}
                  {...register("lastName")}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="phone">Telefonnummer</FieldLabel>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+47 000 00 000"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              <FieldError errors={[errors.phone]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="emergencyPhone">
                Nødkontakt telefonnummer
              </FieldLabel>
              <Input
                id="emergencyPhone"
                type="tel"
                autoComplete="off"
                placeholder="+47 000 00 000"
                aria-invalid={!!errors.emergencyPhone}
                {...register("emergencyPhone")}
              />
              <FieldError errors={[errors.emergencyPhone]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="address">Adresse</FieldLabel>
              <Input
                id="address"
                autoComplete="street-address"
                placeholder="Gateadresse, postnummer, sted"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
              <FieldError errors={[errors.address]} />
            </Field>

            <FieldError errors={[errors.root]} />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Lagrer..." : "Fullfør registrering"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
