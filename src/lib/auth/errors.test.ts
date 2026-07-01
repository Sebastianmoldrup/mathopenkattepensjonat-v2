import { describe, it, expect } from "vitest";
import { getAuthErrorMessage, isEmailNotConfirmedError } from "./errors";

describe("getAuthErrorMessage", () => {
  it("returns default message for null", () => {
    expect(getAuthErrorMessage(null)).toBe("Noe gikk galt. Prøv igjen.");
  });

  it("returns default message for undefined", () => {
    expect(getAuthErrorMessage(undefined)).toBe("Noe gikk galt. Prøv igjen.");
  });

  it("returns Norwegian message for known error code", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials" })).toBe(
      "Feil e-post eller passord"
    );
  });

  it("returns Norwegian message for email_not_confirmed", () => {
    expect(getAuthErrorMessage({ code: "email_not_confirmed" })).toBe(
      "E-posten din er ikke bekreftet ennå"
    );
  });

  it("returns Norwegian message for rate limit error", () => {
    expect(getAuthErrorMessage({ code: "over_email_send_rate_limit" })).toBe(
      "For mange forsøk – vent litt før du prøver igjen"
    );
  });

  it("returns default message for unknown error code", () => {
    expect(getAuthErrorMessage({ code: "totally_unknown_code" })).toBe(
      "Noe gikk galt. Prøv igjen."
    );
  });

  it("returns network error message for AuthRetryableFetchError with status 0", () => {
    expect(
      getAuthErrorMessage({ name: "AuthRetryableFetchError", status: 0 })
    ).toBe("Kunne ikke koble til serveren. Sjekk internettforbindelsen og prøv igjen.");
  });

  it("returns server error message for AuthRetryableFetchError with non-zero status", () => {
    expect(
      getAuthErrorMessage({ name: "AuthRetryableFetchError", status: 500 })
    ).toBe("En feil oppstod på serveren. Prøv igjen om litt.");
  });

  it("returns default message for unrecognised error shape", () => {
    expect(getAuthErrorMessage({ name: "SomeOtherError" })).toBe(
      "Noe gikk galt. Prøv igjen."
    );
  });
});

describe("isEmailNotConfirmedError", () => {
  it("returns true for email_not_confirmed", () => {
    expect(isEmailNotConfirmedError({ code: "email_not_confirmed" })).toBe(true);
  });

  it("returns false for other codes", () => {
    expect(isEmailNotConfirmedError({ code: "invalid_credentials" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isEmailNotConfirmedError(null)).toBe(false);
  });
});
