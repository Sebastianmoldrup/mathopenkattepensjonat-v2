import { describe, it, expect } from "vitest";
import { signUpSchema } from "./signUpSchema";

const valid = {
  email: "test@example.com",
  password: "secret123",
  repeatPassword: "secret123",
  privacyAccepted: true,
};

function firstError(result: ReturnType<typeof signUpSchema.safeParse>, field: string) {
  if (result.success) return null;
  return result.error.issues.find((i) => i.path[0] === field)?.message ?? null;
}

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = signUpSchema.safeParse({ ...valid, email: "" });
    expect(firstError(result, "email")).toBeTruthy();
  });

  it("rejects malformed email", () => {
    const result = signUpSchema.safeParse({ ...valid, email: "notanemail" });
    expect(firstError(result, "email")).toBe("Ugyldig e-postadresse");
  });

  it("rejects password shorter than 6 characters", () => {
    const result = signUpSchema.safeParse({ ...valid, password: "abc", repeatPassword: "abc" });
    expect(firstError(result, "password")).toBe("Passordet må være minst 6 tegn");
  });

  it("rejects password longer than 32 characters", () => {
    const long = "a".repeat(33);
    const result = signUpSchema.safeParse({ ...valid, password: long, repeatPassword: long });
    expect(firstError(result, "password")).toBe("Passordet kan ikke overstige 32 tegn");
  });

  it("rejects mismatched passwords", () => {
    const result = signUpSchema.safeParse({ ...valid, repeatPassword: "different" });
    expect(firstError(result, "repeatPassword")).toBe("Passordene er ikke like");
  });

  it("rejects unpopulated repeatPassword", () => {
    const result = signUpSchema.safeParse({ ...valid, repeatPassword: "" });
    expect(firstError(result, "repeatPassword")).toBeTruthy();
  });

  it("rejects privacy not accepted", () => {
    const result = signUpSchema.safeParse({ ...valid, privacyAccepted: false });
    expect(firstError(result, "privacyAccepted")).toBe(
      "Du må godta personvernerklæringen og vilkårene"
    );
  });
});
