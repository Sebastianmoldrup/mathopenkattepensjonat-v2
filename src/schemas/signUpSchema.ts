import { z } from "zod";

export const signUpSchema = z
  .object({
    email: z.email("Ugyldig e-postadresse"),
    password: z
      .string()
      .min(6, "Passordet må være minst 6 tegn")
      .max(32, "Passordet kan ikke overstige 32 tegn"),
    repeatPassword: z.string().min(1, "Du må gjenta passordet"),
    privacyAccepted: z
      .boolean()
      .refine((val) => val === true, "Du må godta personvernerklæringen og vilkårene"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.repeatPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["repeatPassword"],
        message: "Passordene er ikke like",
      });
    }
  });
