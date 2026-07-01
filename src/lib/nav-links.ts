export type NavRole = "guest" | "user" | "staff" | "admin";

export type NavLink = {
  href: string;
  label: string;
};

export const PUBLIC_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Hjem" },
  { href: "/om-oss", label: "Om oss" },
  { href: "/under-oppholdet", label: "Informasjon" },
  { href: "/priser", label: "Priser & betingelser" },
  { href: "/rom-og-fasiliteter", label: "Rom og fasiliteter" },
  { href: "/kattegalleri", label: "Kattegalleri" },
  { href: "/kontakt", label: "Kontakt" },
];
