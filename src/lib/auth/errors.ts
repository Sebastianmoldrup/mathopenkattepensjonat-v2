type AuthErrorCode =
  // Credentials
  | "invalid_credentials"
  | "email_address_invalid"
  | "email_address_not_authorized"
  | "email_exists"
  | "phone_exists"
  // Confirmation & OTP
  | "email_not_confirmed"
  | "phone_not_confirmed"
  | "otp_expired"
  | "otp_disabled"
  | "token_expired"
  // Password
  | "weak_password"
  | "same_password"
  // Rate limits
  | "over_email_send_rate_limit"
  | "over_sms_send_rate_limit"
  | "over_request_rate_limit"
  // User & session
  | "user_not_found"
  | "user_banned"
  | "session_not_found"
  // Provider / signup
  | "signup_disabled"
  | "provider_disabled"
  | "provider_email_needs_verification"
  | "anonymous_provider_disabled"
  // MFA
  | "mfa_factor_not_found"
  | "mfa_verification_failed"
  | "mfa_verification_rejected"
  // OAuth
  | "bad_oauth_state"
  | "bad_oauth_callback"
  // Misc
  | "email_change_email_already_sent"
  | "invite_not_found"
  | "identity_not_found"
  | "captcha_failed"
  | "request_timeout"
  | "no_authorization";

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  // Credentials
  invalid_credentials: "Feil e-post eller passord",
  email_address_invalid: "Ugyldig e-postadresse",
  email_address_not_authorized: "Denne e-postadressen er ikke tillatt",
  email_exists: "En konto med denne e-postadressen finnes allerede",
  phone_exists: "Dette telefonnummeret er allerede i bruk",
  // Confirmation & OTP
  email_not_confirmed: "E-posten din er ikke bekreftet ennå",
  phone_not_confirmed: "Telefonnummeret ditt er ikke bekreftet ennå",
  otp_expired: "Koden har utgått – be om en ny kode",
  otp_disabled: "Bekreftelse via kode er ikke aktivert. Kontakt oss for hjelp",
  token_expired: "Lenken har utgått – be om en ny",
  // Password
  weak_password: "Passordet er for svakt",
  same_password: "Nytt passord må være ulikt det gamle",
  // Rate limits
  over_email_send_rate_limit: "For mange forsøk – vent litt før du prøver igjen",
  over_sms_send_rate_limit: "For mange SMS-forsøk – vent litt og prøv igjen",
  over_request_rate_limit: "For mange forespørsler – vent litt og prøv igjen",
  // User & session
  user_not_found: "Ingen konto funnet med denne e-postadressen",
  user_banned: "Denne kontoen er suspendert. Kontakt oss for hjelp",
  session_not_found: "Økten din har utløpt – logg inn på nytt",
  // Provider / signup
  signup_disabled: "Registrering er for øyeblikket ikke tilgjengelig",
  provider_disabled: "Denne innloggingsmetoden er ikke aktivert",
  provider_email_needs_verification: "E-posten fra tilbyderen din må bekreftes",
  anonymous_provider_disabled: "Anonym innlogging er ikke aktivert",
  // MFA
  mfa_factor_not_found: "Tofaktorautentisering ikke funnet",
  mfa_verification_failed: "Tofaktorkoden er feil",
  mfa_verification_rejected: "Tofaktorverifisering ble avvist",
  // OAuth
  bad_oauth_state: "Noe gikk galt med innloggingen – prøv igjen",
  bad_oauth_callback: "Noe gikk galt med innloggingen – prøv igjen",
  // Misc
  email_change_email_already_sent:
    "En bekreftelsesmail er allerede sendt – sjekk innboksen din",
  invite_not_found: "Invitasjonen finnes ikke eller har utgått",
  identity_not_found: "Identiteten ble ikke funnet",
  captcha_failed: "CAPTCHA-verifisering feilet – prøv igjen",
  request_timeout: "Forespørselen tok for lang tid – sjekk internettforbindelsen",
  no_authorization: "Ikke autorisert – logg inn og prøv igjen",
};

const DEFAULT_AUTH_ERROR_MESSAGE = "Noe gikk galt. Prøv igjen.";

export function getAuthErrorMessage(
  error: { code?: string; status?: number; name?: string } | null | undefined,
): string {
  if (!error) return DEFAULT_AUTH_ERROR_MESSAGE;
  if (error.code) {
    return AUTH_ERROR_MESSAGES[error.code as AuthErrorCode] ?? DEFAULT_AUTH_ERROR_MESSAGE;
  }
  if (error.name === "AuthRetryableFetchError") {
    return error.status === 0
      ? "Kunne ikke koble til serveren. Sjekk internettforbindelsen og prøv igjen."
      : "En feil oppstod på serveren. Prøv igjen om litt.";
  }
  return DEFAULT_AUTH_ERROR_MESSAGE;
}

export function isEmailNotConfirmedError(
  error: { code?: string } | null | undefined,
): boolean {
  return error?.code === "email_not_confirmed";
}
