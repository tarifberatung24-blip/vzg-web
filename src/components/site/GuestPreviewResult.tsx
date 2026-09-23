import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BUSINESS_MODEL_LABELS,
  COMPLIANCE_LABELS,
  COMPLIANCE_TONE,
  FEASIBILITY_LABELS,
  RISK_LABELS,
  formatMarket,
  type GuestPreviewSuccess,
} from "@/lib/preview.schema";
import { Panel } from "@/components/site/primitives";

/** Colours are the only thing driven by tone; the status text is always literal. */
const COMPLIANCE_CLASSES: Record<string, string> = {
  safe: "border-accent/40 text-accent",
  caution: "border-amber-500/40 text-amber-400",
  review: "border-amber-500/40 text-amber-400",
  blocked: "border-destructive/50 text-destructive",
};

const FEASIBILITY_CLASSES: Record<string, string> = {
  STRAIGHTFORWARD: "border-accent/40 text-accent",
  MODERATE: "border-border text-foreground",
  COMPLEX: "border-amber-500/40 text-amber-400",
  HIGH_UNCERTAINTY: "border-destructive/50 text-destructive",
};

function Block({
  index,
  label,
  children,
}: {
  index: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        <span className="text-accent">{index}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

export function GuestPreviewResult({
  result,
  onReset,
  onCreateAccount,
}: {
  result: GuestPreviewSuccess;
  onReset: () => void;
  onCreateAccount: () => void;
}) {
  const { analysis } = result;
  const complianceTone = COMPLIANCE_TONE[analysis.compliance.status];

  return (
    <div className="space-y-6">
      <Panel className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            Vorprüfung · {formatMarket(result.market)}
          </span>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            {result.remaining > 0
              ? `${result.remaining} kostenlose Vorprüfung${result.remaining === 1 ? "" : "en"} verbleibend`
              : "Kontingent dieser Sitzung aufgebraucht"}
          </span>
        </div>

        {result.blocked && (
          <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
            <Info className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Auf Basis Ihrer Beschreibung wurde kein bewertbares Geschäftskonzept erkannt. Aus
              diesem Grund wird hier keine weitere Einschätzung abgegeben. Bei einem zulässigen
              Vorhaben formulieren Sie die Idee bitte erneut.
            </p>
          </div>
        )}

        {!result.blocked && (
          <>
            <Block index="01" label="Was Sie aufbauen möchten">
              <p className="lede text-base">{analysis.ideaSummary}</p>
            </Block>

            <Block index="02" label="Compliance-Signal">
              <span
                className={
                  "inline-flex items-center rounded-sm border px-2.5 py-1 font-mono text-[0.625rem] tracking-widest uppercase " +
                  (COMPLIANCE_CLASSES[complianceTone] ?? "border-border text-foreground")
                }
              >
                {COMPLIANCE_LABELS[analysis.compliance.status]}
              </span>
              <p className="text-sm text-muted-foreground">{analysis.compliance.explanation}</p>
            </Block>

            <Block index="03" label="Geschäftsmodell">
              <span className="font-mono text-xs text-foreground">
                {BUSINESS_MODEL_LABELS[analysis.businessModel.type]}
              </span>
              <p className="text-sm text-muted-foreground">{analysis.businessModel.explanation}</p>
            </Block>

            <Block index="04" label="Monetarisierungs-Hypothese">
              <ul className="space-y-2">
                {analysis.monetizationHypothesis.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-accent" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Block>

            <Block index="05" label="Technische Machbarkeit">
              <span
                className={
                  "inline-flex items-center rounded-sm border px-2.5 py-1 font-mono text-[0.625rem] tracking-widest uppercase " +
                  (FEASIBILITY_CLASSES[analysis.technicalFeasibility.level] ?? "border-border")
                }
              >
                {FEASIBILITY_LABELS[analysis.technicalFeasibility.level]}
              </span>
              <p className="text-sm text-muted-foreground">
                {analysis.technicalFeasibility.explanation}
              </p>
            </Block>

            <Block index="06" label="Zentrale Risiken">
              <ul className="space-y-3">
                {analysis.keyRisks.map((risk) => (
                  <li key={`${risk.category}-${risk.description}`} className="space-y-1">
                    <span className="font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
                      {RISK_LABELS[risk.category]}
                    </span>
                    <p className="text-sm text-muted-foreground">{risk.description}</p>
                  </li>
                ))}
              </ul>
            </Block>

            <Block index="07" label="Nächste Validierungsschritte">
              <ol className="space-y-2">
                {analysis.validationSteps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="font-mono text-xs text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Block>
          </>
        )}

        <Block index={result.blocked ? "08" : "08"} label="Grenzen dieser Vorprüfung">
          <ul className="space-y-2">
            {result.limitations.map((limitation) => (
              <li key={limitation} className="flex gap-3 text-xs text-muted-foreground">
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
                  aria-hidden
                />
                {limitation}
              </li>
            ))}
          </ul>
        </Block>
      </Panel>

      <Panel className="space-y-5">
        <div>
          <p className="eyebrow">Nächster Schritt</p>
          <h3 className="display mt-3 text-2xl">
            Das war eine Vorprüfung. Die vollständige Analyse liefert die Belege.
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Die vollständige Project-Intelligence-Analyse recherchiert Quellen, prüft Aussagen
          unabhängig, betreibt Red-Teaming, modelliert Markt und Finanzen und erstellt einen
          belegten Bericht. Mit einem Business Account erhalten Sie drei vollständige Analysen
          kostenlos; jede weitere Analyse kostet 49 €.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="accent" size="lg" onClick={onCreateAccount}>
            Business Account erstellen <ArrowRight />
          </Button>
          <Button variant="ghost" size="lg" onClick={onReset}>
            Weitere Idee prüfen
          </Button>
        </div>
      </Panel>
    </div>
  );
}
