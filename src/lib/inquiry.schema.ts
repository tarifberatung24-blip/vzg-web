import { z } from "zod";

export const projectTypes = [
  "AI Automation",
  "n8n Automation",
  "Customer Service Automation",
  "Online Shop",
  "Custom Application",
  "Business Platform",
  "Other",
] as const;

export const timeframes = [
  "So schnell wie möglich",
  "1–3 Monate",
  "3–6 Monate",
  "Noch offen",
] as const;

export const budgets = [
  "Unter 5.000 €",
  "5.000 – 15.000 €",
  "15.000 – 40.000 €",
  "Über 40.000 €",
  "Noch offen",
] as const;

const text = (max: number) => z.string().trim().max(max);

export const inquirySchema = z.object({
  name: text(100).min(2, "Bitte geben Sie Ihren Namen an."),
  email: z.string().trim().email("Bitte eine gültige geschäftliche E-Mail-Adresse angeben.").max(255),
  company: text(150).min(2, "Bitte geben Sie Ihr Unternehmen an."),
  website: text(255).optional().or(z.literal("")),
  country: text(80).min(2, "Bitte geben Sie das Land an."),
  phone: text(40).optional().or(z.literal("")),
  projectType: z.enum(projectTypes, { message: "Bitte wählen Sie einen Projekttyp." }),
  problem: text(3000).min(20, "Bitte beschreiben Sie das aktuelle Problem (mind. 20 Zeichen)."),
  desiredResult: text(3000).min(20, "Bitte beschreiben Sie das gewünschte Ergebnis (mind. 20 Zeichen)."),
  tools: text(1000).optional().or(z.literal("")),
  timeframe: z.enum(timeframes, { message: "Bitte wählen Sie einen Zeitrahmen." }),
  budget: z.enum(budgets, { message: "Bitte wählen Sie einen Budgetrahmen." }),
  consent: z.literal(true, { message: "Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu." }),
});

export type InquiryInput = z.infer<typeof inquirySchema>;
