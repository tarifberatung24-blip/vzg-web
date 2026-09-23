import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  IDEA_MIN_LENGTH,
  MARKET_IDS,
  MARKETS,
  PREVIEW_ERROR_MESSAGES,
  guestPreviewInputSchema,
  guestPreviewResponseSchema,
  type GuestPreviewInput,
  type GuestPreviewResponse,
  type MarketId,
} from "@/lib/preview.schema";

export function GuestPreviewForm({
  onResult,
  disabled,
  remaining,
}: {
  onResult: (response: GuestPreviewResponse) => void;
  disabled: boolean;
  remaining: number | null;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuestPreviewInput>({
    resolver: zodResolver(guestPreviewInputSchema),
    defaultValues: { idea: "", market: "deutschland", audience: "" },
  });

  const market = watch("market");
  const ideaLength = (watch("idea") ?? "").length;

  const mutation = useMutation({
    mutationFn: async (values: GuestPreviewInput) => {
      const { runGuestPreview } = await import("@/lib/preview.functions");
      const response = await runGuestPreview({ data: values });
      // Validate the wire shape on the client. If the server ever returned an
      // extra or malformed field, this fails loudly instead of rendering it.
      const parsed = guestPreviewResponseSchema.safeParse(response);
      if (!parsed.success) {
        return {
          ok: false as const,
          code: "SERVER_ERROR" as const,
          message: PREVIEW_ERROR_MESSAGES.SERVER_ERROR,
        };
      }
      return parsed.data;
    },
    onSuccess: (response) => onResult(response),
  });

  const characterHint = useMemo(() => {
    if (ideaLength === 0) return `Mindestens ${IDEA_MIN_LENGTH} Zeichen.`;
    if (ideaLength < IDEA_MIN_LENGTH) {
      return `Noch ${IDEA_MIN_LENGTH - ideaLength} Zeichen bis zur Mindestlänge.`;
    }
    return null;
  }, [ideaLength]);

  return (
    <form
      noValidate
      className="panel space-y-7 rounded-lg p-6 md:p-8"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <div className="space-y-2">
        <Label htmlFor="gp-idea" className="text-sm">
          Was möchten Sie erstellen?
        </Label>
        <Textarea
          id="gp-idea"
          rows={7}
          maxLength={2000}
          placeholder="Beschreiben Sie Ihre Geschäftsidee in ein paar Sätzen: Was soll entstehen, für wen, und welches Problem wird gelöst?"
          {...register("idea")}
        />
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-destructive">{errors.idea?.message}</span>
          <span className="shrink-0 font-mono text-muted-foreground">{characterHint}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm">In welchem Markt soll das Produkt angeboten werden?</Label>
        <div className="flex flex-wrap gap-2">
          {MARKET_IDS.map((id: MarketId) => (
            <button
              key={id}
              type="button"
              aria-pressed={market === id}
              onClick={() => setValue("market", id, { shouldValidate: true })}
              className={
                "rounded-sm border px-3 py-1.5 text-sm transition-colors " +
                (market === id
                  ? "border-accent text-accent"
                  : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {MARKETS[id]}
            </button>
          ))}
        </div>
        {errors.market && <p className="text-xs text-destructive">{errors.market.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gp-audience" className="text-sm">
          Wer soll das Produkt nutzen? <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="gp-audience"
          maxLength={200}
          placeholder="z. B. Handwerksbetriebe mit 5–50 Mitarbeitenden"
          {...register("audience")}
        />
      </div>

      {mutation.isError && (
        <ErrorNotice message="Die Vorprüfung konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut." />
      )}

      <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span>
            Keine Anmeldung erforderlich. Ihre Angaben werden nur für diese Vorprüfung verarbeitet.
            {remaining !== null && remaining > 0 ? ` Verbleibend: ${remaining}.` : ""}
          </span>
        </p>
        <Button
          type="submit"
          size="xl"
          variant="default"
          disabled={disabled || mutation.isPending}
          className="shrink-0"
        >
          {mutation.isPending ? (
            <>
              Vorprüfung läuft <Loader2 className="animate-spin" />
            </>
          ) : (
            <>
              Geschäftsidee kostenlos prüfen <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
