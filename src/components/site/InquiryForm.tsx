import type { ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { budgets, inquirySchema, projectTypes, timeframes, type InquiryInput } from "@/lib/inquiry.schema";
import { submitInquiry } from "@/lib/inquiry.functions";

export function InquiryForm({ defaultProjectType }: { defaultProjectType?: InquiryInput["projectType"] }) {
  const send = useServerFn(submitInquiry);
  const form = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      website: "",
      country: "Deutschland",
      phone: "",
      projectType: defaultProjectType,
      problem: "",
      desiredResult: "",
      tools: "",
      consent: undefined as unknown as true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: InquiryInput) => send({ data }),
    onSuccess: () => {
      toast.success("Anfrage übermittelt. Sie erhalten innerhalb von 2 Werktagen eine Rückmeldung.");
    },
    onError: () => {
      toast.error("Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es erneut.");
    },
  });

  const { register, handleSubmit, setValue, watch, formState } = form;
  const errors = formState.errors;

  if (mutation.isSuccess) {
    return (
      <div className="panel rounded-lg p-10 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full border border-accent text-accent">
          <Check className="size-5" />
        </div>
        <h2 className="display mt-6 text-3xl">Anfrage eingegangen.</h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Vielen Dank. Ihre Anfrage wird persönlich geprüft – Sie erhalten innerhalb von 2 Werktagen eine
          Rückmeldung mit einer ersten Einschätzung.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      noValidate
      className="panel space-y-10 rounded-lg p-6 md:p-10"
    >
      <fieldset className="space-y-6">
        <legend className="eyebrow mb-6">01 · Kontakt</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Name" error={errors.name?.message} required>
            <Input {...register("name")} autoComplete="name" />
          </Field>
          <Field label="Geschäftliche E-Mail" error={errors.email?.message} required>
            <Input type="email" {...register("email")} autoComplete="email" />
          </Field>
          <Field label="Unternehmen" error={errors.company?.message} required>
            <Input {...register("company")} autoComplete="organization" />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <Input {...register("website")} placeholder="https://" autoComplete="url" />
          </Field>
          <Field label="Land" error={errors.country?.message} required>
            <Input {...register("country")} autoComplete="country-name" />
          </Field>
          <Field label="Telefon (optional)" error={errors.phone?.message}>
            <Input type="tel" {...register("phone")} autoComplete="tel" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-6">02 · Vorhaben</legend>
        <Field label="Was möchten Sie umsetzen?" error={errors.projectType?.message} required>
          <Select
            value={watch("projectType")}
            onValueChange={(v) => setValue("projectType", v as InquiryInput["projectType"], { shouldValidate: true })}
          >
            <SelectTrigger aria-label="Projekttyp">
              <SelectValue placeholder="Bitte wählen" />
            </SelectTrigger>
            <SelectContent>
              {projectTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Beschreiben Sie das aktuelle Problem." error={errors.problem?.message} required>
          <Textarea rows={5} {...register("problem")} />
        </Field>
        <Field label="Beschreiben Sie das gewünschte Ergebnis." error={errors.desiredResult?.message} required>
          <Textarea rows={5} {...register("desiredResult")} />
        </Field>
        <Field label="Aktuelle Tools / Systeme" error={errors.tools?.message}>
          <Input {...register("tools")} placeholder="z. B. Salesforce, HubSpot, Shopify, SAP, Microsoft 365" />
        </Field>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="eyebrow mb-6">03 · Rahmen</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Gewünschter Zeitrahmen" error={errors.timeframe?.message} required>
            <Select
              value={watch("timeframe")}
              onValueChange={(v) => setValue("timeframe", v as InquiryInput["timeframe"], { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Zeitrahmen">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {timeframes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Budgetrahmen" error={errors.budget?.message} required>
            <Select
              value={watch("budget")}
              onValueChange={(v) => setValue("budget", v as InquiryInput["budget"], { shouldValidate: true })}
            >
              <SelectTrigger aria-label="Budgetrahmen">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div>
          <Label className="text-sm">Unterlagen (optional)</Label>
          <div className="mt-2 flex items-center gap-3 rounded-md border border-dashed border-border-strong px-4 py-5 text-sm text-muted-foreground">
            <Paperclip className="size-4" />
            <span>
              Datei-Upload wird mit der sicheren Übermittlung aktiviert. Bis dahin können Unterlagen nach
              der ersten Rückmeldung nachgereicht werden.
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="consent"
            checked={watch("consent") === true}
            onCheckedChange={(c) => setValue("consent", (c === true) as true, { shouldValidate: true })}
          />
          <div>
            <Label htmlFor="consent" className="text-sm leading-relaxed font-normal text-muted-foreground">
              Ich stimme zu, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden. Hinweise
              zum Datenschutz finden Sie in der Datenschutzerklärung.
            </Label>
            {errors.consent?.message && <p className="mt-1 text-xs text-destructive">{errors.consent.message}</p>}
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Persönliche Rückmeldung innerhalb von 2 Werktagen.
        </p>
        <Button type="submit" size="xl" disabled={mutation.isPending}>
          {mutation.isPending ? "Wird gesendet…" : "Projekt anfragen"} <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
