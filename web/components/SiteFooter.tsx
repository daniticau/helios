export function SiteFooter() {
  return (
    <footer
      className="mt-28 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg-deep)]/50"
      style={{ fontFamily: 'var(--font-mono)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <div
          className="type-display-small text-[color:var(--color-text)]"
          style={{ fontSize: 22 }}
        >
          solar economics,
          <br />
          <span className="text-[color:var(--color-accent)]">decided in 20 seconds.</span>
        </div>
      </div>
    </footer>
  );
}
