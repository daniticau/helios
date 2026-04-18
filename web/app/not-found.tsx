// Explicit 404 so Next 15 doesn't fall back to its auto-generated
// variant (which has been flaky with next/font on Windows).

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col items-start justify-center px-6">
      <div
        className="text-[10.5px] uppercase tracking-[0.32em] text-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        // signal lost · 404
      </div>
      <h1
        className="mt-5 text-[color:var(--color-text)]"
        style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: '"opsz" 144',
          fontSize: 'clamp(48px, 8vw, 112px)',
          lineHeight: 0.95,
          letterSpacing: '-0.035em',
          fontWeight: 700,
        }}
      >
        nothing <span style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>here.</span>
      </h1>
      <p className="mt-6 max-w-md text-[15px] text-[color:var(--color-text-muted)]">
        The coordinates you dialed don&apos;t resolve to anything on helios. Head
        back and try an address.
      </p>
      <Link
        href="/"
        className="mt-9 inline-flex items-center gap-2 rounded-sm border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-5 py-3 text-[12px] uppercase tracking-[0.26em] text-[color:var(--color-text)] hover:border-[color:var(--color-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        ← return to mission
      </Link>
    </main>
  );
}
