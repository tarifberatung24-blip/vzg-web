/**
 * Abstract system diagram: input nodes → orchestration core → output systems.
 * Pure SVG, uses design tokens via currentColor / CSS variables.
 */
export function SystemDiagram({ className }: { className?: string }) {
  const inputs = ["Anfragen", "Dokumente", "Bestellungen", "Events"];
  const outputs = ["CRM", "Kommunikation", "Operations", "Reporting"];

  return (
    <svg
      viewBox="0 0 560 360"
      className={className}
      role="img"
      aria-label="Schematische Darstellung: Eingänge werden über ein zentrales System orchestriert und an Zielsysteme ausgegeben"
      fill="none"
    >
      <defs>
        <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="var(--color-line)" />
        </pattern>
      </defs>
      <rect width="560" height="360" fill="url(#dots)" />

      {inputs.map((label, i) => {
        const y = 60 + i * 80;
        return (
          <g key={label}>
            <path
              d={`M 120 ${y} C 190 ${y}, 200 180, 250 180`}
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
            <path
              d={`M 120 ${y} C 190 ${y}, 200 180, 250 180`}
              stroke="var(--color-accent)"
              strokeWidth="1.2"
              className="flow-line"
              style={{ animationDelay: `${i * -1.7}s` }}
            />
            <rect x="20" y={y - 16} width="100" height="32" rx="3" fill="var(--color-surface)" stroke="var(--color-border-strong)" />
            <text x="70" y={y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-foreground)" letterSpacing="1">
              {label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {outputs.map((label, i) => {
        const y = 60 + i * 80;
        return (
          <g key={label}>
            <path
              d={`M 310 180 C 360 180, 370 ${y}, 440 ${y}`}
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
            <path
              d={`M 310 180 C 360 180, 370 ${y}, 440 ${y}`}
              stroke="var(--color-accent)"
              strokeWidth="1.2"
              className="flow-line"
              style={{ animationDelay: `${i * -1.3 - 0.8}s` }}
            />
            <rect x="440" y={y - 16} width="100" height="32" rx="3" fill="var(--color-surface)" stroke="var(--color-border-strong)" />
            <text x="490" y={y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10" fill="var(--color-foreground)" letterSpacing="1">
              {label.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Core */}
      <rect x="250" y="130" width="60" height="100" rx="4" fill="var(--color-surface-raised)" stroke="var(--color-accent)" strokeWidth="1.2" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x="262" y={144 + i * 20} width="36" height="8" rx="1" fill="var(--color-border-strong)" />
      ))}
      <circle cx="280" cy="120" r="3" fill="var(--color-accent)" className="animate-pulse-dot" />
      <text x="280" y="252" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-muted-foreground)" letterSpacing="2">
        SYSTEM
      </text>
    </svg>
  );
}
