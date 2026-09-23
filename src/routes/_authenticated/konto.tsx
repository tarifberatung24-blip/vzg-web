import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Container, Eyebrow, Panel, PilotBadge } from "@/components/site/primitives";
import { supabase } from "@/integrations/supabase/client";
import { createAnalysis, getAccountOverview } from "@/lib/account.functions";
import { analysisSchema, formatEuro, type AnalysisInput } from "@/lib/account.schema";
import { pageHead } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/konto")({
  head: () =>
    pageHead({
      title: "Ihr Geschäftskonto — VZG Project Intelligence",
      description:
        "Übersicht über Ihr verifiziertes Geschäftskonto: verbleibende kostenlose Analysen, eingereichte Analysen und der Zahlungsstatus kostenpflichtiger Analysen (49,00 €).",
      path: "/konto",
    }),
  component: AccountPage,
});

const statusLabels: Record<string, string> = {
  eingereicht: "Eingereicht",
  in_bearbeitung: "In Bearbeitung",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

const paymentLabels: Record<string, string> = {
  nicht_erforderlich: "Kostenlos (Freikontingent)",
  offen: "Zahlung offen",
  bezahlt: "Bezahlt",
};

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadAccount = useServerFn(getAccountOverview);
  const submitAnalysis = useServerFn(createAnalysis);

  const { data, isLoading } = useQuery({
    queryKey: ["account-overview"],
    queryFn: () => loadAccount(),
  });

  const form = useForm<AnalysisInput>({
    resolver: zodResolver(analysisSchema),
    defaultValues: { title: "", idea: "", targetGroup: "", assumptions: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: AnalysisInput) => submitAnalysis({ data: values }),
    onSuccess: (row) => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["account-overview"] });
      toast.success(
        row.billingKind === "frei"
          ? "Analyse eingereicht – eine kostenlose Analyse wurde verwendet."
          : `Analyse eingereicht – ${formatEuro(row.amountCents)} offen.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <section className="border-b border-border">
        <Container className="flex flex-col gap-6 py-14 md:flex-row md:items-end md:justify-between md:py-20">
          <div>
            <PilotBadge className="mb-5" />
            <Eyebrow>Geschäftskonto</Eyebrow>
            <h1 className="display mt-5 text-3xl md:text-5xl">{data?.company || "Ihr Konto"}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{data?.email}</p>
          </div>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              queryClient.clear();
              void navigate({ to: "/auth" });
            }}
          >
            Abmelden <LogOut />
          </Button>
        </Container>
      </section>

      <Container className="space-y-12 py-14 md:py-20">
        {data && !data.verified && (
          <div className="flex items-start gap-3 rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-muted-foreground">
              Ihre geschäftliche E-Mail-Adresse ist noch nicht bestätigt. Bitte klicken Sie auf den Link in
              der Bestätigungs-E-Mail – danach sind die drei kostenlosen Analysen freigeschaltet.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Panel>
            <p className="eyebrow">Status</p>
            <p className="mt-4 text-2xl font-medium tracking-tight">
              {data?.verified ? "Verifiziert" : "Nicht verifiziert"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Verifizierung über geschäftliche E-Mail-Adresse.</p>
          </Panel>
          <Panel>
            <p className="eyebrow">Kostenlose Analysen</p>
            <p className="mt-4 text-2xl font-medium tracking-tight">
              {data ? `${data.freeRemaining} von ${data.freeTotal}` : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data ? `${data.freeUsed} verwendet. Danach 49,00 € je Analyse.` : "Wird geladen…"}
            </p>
          </Panel>
          <Panel>
            <p className="eyebrow">Offener Betrag</p>
            <p className="mt-4 text-2xl font-medium tracking-tight">
              {data ? formatEuro(data.openAmountCents) : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Kostenpflichtige Analysen werden nach Rückmeldung in Rechnung gestellt.
            </p>
          </Panel>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <form
            noValidate
            className="panel space-y-6 rounded-lg p-6 md:p-8"
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          >
            <div>
              <p className="eyebrow">Neue Analyse</p>
              <h2 className="display mt-3 text-2xl">Geschäftsidee einreichen.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {data && data.freeRemaining > 0
                  ? `Diese Analyse verwendet eine Ihrer ${data.freeRemaining} kostenlosen Analysen.`
                  : "Ihr Freikontingent ist aufgebraucht – diese Analyse wird mit 49,00 € erfasst."}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Titel</Label>
              <Input {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Idee</Label>
              <Textarea rows={6} {...form.register("idea")} />
              {form.formState.errors.idea && (
                <p className="text-xs text-destructive">{form.formState.errors.idea.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Zielgruppe (optional)</Label>
              <Input {...form.register("targetGroup")} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Zentrale Annahmen (optional)</Label>
              <Textarea rows={3} {...form.register("assumptions")} />
            </div>
            <Button type="submit" size="xl" variant="accent" disabled={mutation.isPending || !data?.verified}>
              {mutation.isPending ? "Wird eingereicht…" : "Analyse einreichen"} <ArrowRight />
            </Button>
          </form>

          <div>
            <p className="eyebrow">Ihre Analysen</p>
            <div className="mt-5 divide-y divide-border rounded-lg border border-border">
              {isLoading && <p className="p-6 text-sm text-muted-foreground">Wird geladen…</p>}
              {data?.analyses.length === 0 && (
                <p className="p-6 text-sm text-muted-foreground">Noch keine Analyse eingereicht.</p>
              )}
              {data?.analyses.map((a) => (
                <div key={a.id} className="space-y-3 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium">{a.title}</p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("de-DE")}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{statusLabels[a.status] ?? a.status}</Badge>
                    <Badge tone={a.paymentStatus === "offen" ? "accent" : "muted"}>
                      {paymentLabels[a.paymentStatus] ?? a.paymentStatus}
                      {a.amountCents > 0 ? ` · ${formatEuro(a.amountCents)}` : ""}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

function Badge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "accent" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-1 font-mono text-[0.625rem] tracking-widest uppercase",
        tone === "accent" ? "border-accent/50 text-accent" : "border-border text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
