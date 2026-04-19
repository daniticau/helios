// Credibility one-liner: "N recent installs in your ZIP averaging X kW".
// Pulled from the ZenPower CSV summary. Conditional on the ROI response
// including the zenpower fields — skips rendering if nothing to say.

interface Props {
  permitsInZip?: number | null;
  avgSystemKw?: number | null;
}

export function ZenPowerLine({ permitsInZip, avgSystemKw }: Props) {
  if (permitsInZip == null || avgSystemKw == null) return null;
  return (
    <div className="relative rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)]/50 px-5 py-4">
      <div className="type-eyebrow type-eyebrow-accent">installs in your zip</div>
      <div
        className="mt-2 text-[14.5px] leading-6 text-[color:var(--color-text)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span className="text-[color:var(--color-accent)]">{permitsInZip}</span>{' '}
        recent installs in your ZIP averaging{' '}
        <span className="text-[color:var(--color-accent)]">
          {avgSystemKw.toFixed(1)} kW
        </span>
        .
      </div>
    </div>
  );
}
