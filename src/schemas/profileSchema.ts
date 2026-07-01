import { z } from "zod";

const norwegianPhoneRegex = /^(?:\+47)?\s?\d{8}$/;

const requiredPhoneSchema = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .regex(norwegianPhoneRegex, "Ugyldig telefonnummer");

export const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Fornavn er påkrevd")
    .max(50, "Fornavn er for langt"),

  lastName: z
    .string()
    .trim()
    .min(1, "Etternavn er påkrevd")
    .max(50, "Etternavn er for langt"),

  phone: requiredPhoneSchema("Telefonnummer er påkrevd"),

  emergencyPhone: requiredPhoneSchema("Nødkontakt telefonnummer er påkrevd"),

  address: z
    .string()
    .trim()
    .min(1, "Adresse er påkrevd")
    .max(200, "Adresse er for lang"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
