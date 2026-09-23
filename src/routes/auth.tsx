import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Container, Eyebrow } from "@/components/site/primitives";
import { supabase } from "@/integrations/supabase/client";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "@/lib/account.schema";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  head: () =>
    pageHead({
      title: "Geschäftskonto — VZG Project Intelligence",
      description:
        "Geschäftskonto für VZG Project Intelligence anlegen oder anmelden: drei kostenlose Analysen nach Bestätigung der geschäftlichen E-Mail-Adresse.",
      path: "/auth",
    }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [confirmSent, setConfirmSent] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/konto" });
    });
  }, [navigate]);

  return (
    <section className="border-b border-border">
      <Container className="grid max-w-3xl gap-10 py-20 md:py-28">
        <div>
          <Eyebrow>Geschäftskonto</Eyebrow>
          <h1 className="display mt-6 text-4xl md:text-5xl">
            {mode === "signup" ? "Konto anlegen." : "Anmelden."}
          </h1>
          <p className="lede mt-6">
            Nach Bestätigung Ihrer geschäftlichen E-Mail-Adresse stehen Ihnen drei vollständige Analysen
            kostenlos zur Verfügung. Jede weitere Analyse wird mit 49,00 € abgerechnet.
          </p>
        </div>

        {confirmSent ? (
          <div className="panel rounded-lg p-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full border border-accent text-accent">
              <MailCheck className="size-5" />
            </div>
            <h2 className="display mt-6 text-2xl">Bestätigung versendet.</h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Wir haben einen Bestätigungslink an <span className="text-foreground">{confirmSent}</span>{" "}
              gesendet. Nach dem Klick auf den Link ist Ihr Geschäftskonto verifiziert und die drei
              kostenlosen Analysen sind freigeschaltet.
            </p>
          </div>
        ) : mode === "signup" ? (
          <SignUpForm onSent={setConfirmSent} />
        ) : (
          <SignInForm />
        )}

        {!confirmSent && (
          <p className="text-sm text-muted-foreground">
            {mode === "signup" ? "Bereits ein Konto?" : "Noch kein Konto?"}{" "}
            <button
              type="button"
              className="text-foreground underline underline-offset-4"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Anmelden" : "Konto anlegen"}
            </button>
            {" · "}
            <Link to="/project-intelligence" className="underline underline-offset-4">
              Was wird analysiert?
            </Link>
          </p>
        )}
      </Container>
    </section>
  );
}

function SignUpForm({ onSent }: { onSent: (email: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", company: "", country: "Deutschland", email: "", password: "" },
  });

  return (
    <form
      noValidate
      className="panel space-y-6 rounded-lg p-6 md:p-8"
      onSubmit={handleSubmit(async (values) => {
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/konto`,
            data: { full_name: values.fullName, company: values.company, country: values.country },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        onSent(values.email);
      })}
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="Name" error={errors.fullName?.message}>
          <Input {...register("fullName")} autoComplete="name" />
        </FormField>
        <FormField label="Unternehmen" error={errors.company?.message}>
          <Input {...register("company")} autoComplete="organization" />
        </FormField>
        <FormField label="Land" error={errors.country?.message}>
          <Input {...register("country")} autoComplete="country-name" />
        </FormField>
        <FormField label="Geschäftliche E-Mail" error={errors.email?.message}>
          <Input type="email" {...register("email")} autoComplete="email" />
        </FormField>
      </div>
      <FormField label="Passwort" error={errors.password?.message}>
        <Input type="password" {...register("password")} autoComplete="new-password" />
      </FormField>
      <Button type="submit" size="xl" variant="accent" disabled={isSubmitting}>
        {isSubmitting ? "Wird angelegt…" : "Konto anlegen"} <ArrowRight />
      </Button>
    </form>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      noValidate
      className="panel space-y-6 rounded-lg p-6 md:p-8"
      onSubmit={handleSubmit(async (values) => {
        const { error } = await supabase.auth.signInWithPassword(values);
        if (error) {
          toast.error(error.message);
          return;
        }
        void navigate({ to: "/konto" });
      })}
    >
      <FormField label="Geschäftliche E-Mail" error={errors.email?.message}>
        <Input type="email" {...register("email")} autoComplete="email" />
      </FormField>
      <FormField label="Passwort" error={errors.password?.message}>
        <Input type="password" {...register("password")} autoComplete="current-password" />
      </FormField>
      <Button type="submit" size="xl" disabled={isSubmitting}>
        {isSubmitting ? "Anmeldung…" : "Anmelden"} <ArrowRight />
      </Button>
    </form>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
