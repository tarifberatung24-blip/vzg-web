import { z } from "zod";

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Bitte geben Sie Ihren Namen an.").max(100),
  company: z.string().trim().min(2, "Bitte geben Sie Ihr Unternehmen an.").max(150),
  country: z.string().trim().min(2, "Bitte geben Sie das Land an.").max(80),
  email: z.string().trim().email("Bitte eine gültige geschäftliche E-Mail-Adresse angeben.").max(255),
  password: z.string().min(8, "Mindestens 8 Zeichen."),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse angeben.").max(255),
  password: z.string().min(1, "Bitte Passwort eingeben."),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const analysisSchema = z.object({
  title: z.string().trim().min(3, "Bitte geben Sie einen Titel an.").max(150),
  idea: z.string().trim().min(40, "Bitte beschreiben Sie die Idee (mind. 40 Zeichen).").max(4000),
  targetGroup: z.string().trim().max(500).optional().or(z.literal("")),
  assumptions: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type AnalysisInput = z.infer<typeof analysisSchema>;

export const ANALYSIS_PRICE_CENTS = 4900;
export const FREE_ANALYSES = 3;

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
