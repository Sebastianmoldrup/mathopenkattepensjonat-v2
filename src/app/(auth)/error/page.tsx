import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, { title: string; description: string; action: { label: string; href: string } }> = {
  ugyldig_lenke: {
    title: "Ugyldig lenke",
    description: "Bekreftelseslenken er ugyldig eller mangler informasjon.",
    action: { label: "Opprett konto på nytt", href: "/registrering" },
  },
  lenke_utgaatt: {
    title: "Lenken har utløpt",
    description:
      "Bekreftelseslenken er ikke lenger gyldig. Be om en ny lenke fra registreringssiden.",
    action: { label: "Be om ny lenke", href: "/registrering" },
  },
  bekreftelse_feilet: {
    title: "Bekreftelse feilet",
    description:
      "Vi kunne ikke bekrefte e-postadressen din. Lenken kan allerede ha blitt brukt.",
    action: { label: "Logg inn", href: "/login" },
  },
};

const DEFAULT_ERROR = {
  title: "Noe gikk galt",
  description: "En uventet feil oppstod. Prøv igjen eller kontakt oss hvis problemet vedvarer.",
  action: { label: "Gå til innlogging", href: "/login" },
};

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const error = params.code
    ? (ERROR_MESSAGES[params.code] ?? DEFAULT_ERROR)
    : DEFAULT_ERROR;

  return (
    <>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <span className="text-2xl">!</span>
        </div>
        <CardTitle className="text-2xl">{error.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-center text-sm text-muted-foreground">
          {error.description}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={error.action.href}>{error.action.label}</Link>
        </Button>
      </CardFooter>
    </>
  );
}

export default function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <Suspense>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}
