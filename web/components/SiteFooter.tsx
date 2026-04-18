// Lower instrument strip — mirrors the header. Coordinates + build stamp.

export function SiteFooter() {
  return (
    <footer
      className="mt-28 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/50"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]">
              ◇ helios
            </div>
            <div className="type-display-small text-[color:var(--color-text)]" style={{ fontSize: 22 }}>
              solar economics,
              <br />
              <span className="text-[color:var(--color-accent)]">decided in 20 seconds.</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[11px]">
            <div className="space-y-1.5">
              <div className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]">
                node
              </div>
              <a
                href="https://github.com/daniticau/helios"
                target="_blank"
                rel="noreferrer"
                className="block text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
              >
                github ↗
              </a>
              <a
                href="https://orthogonal.com"
                target="_blank"
                rel="noreferrer"
                className="block text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
              >
                orthogonal ↗
              </a>
            </div>
            <div className="space-y-1.5">
              <div className="text-[9px] uppercase tracking-[0.3em] text-[color:var(--color-text-dim)]">
                mission
              </div>
              <div className="text-[color:var(--color-text-muted)]">datahacks 2026</div>
              <div className="text-[color:var(--color-text-muted)]">best use of orthogonal</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--color-hairline)] pt-4 text-[10px] uppercase tracking-[0.25em] text-[color:var(--color-text-dimmer)]">
          <span>32.8801°n · 117.2340°w</span>
          <span className="hidden sm:block">
            ten paid apis <span className="mx-2 text-[color:var(--color-accent)]">·</span> one sdk
          </span>
          <span>build · 0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
