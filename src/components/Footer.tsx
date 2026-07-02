export default function Footer() {
  return (
    <footer className="mt-xl border-t border-border-soft bg-white">
      <div className="container-page flex flex-col items-center justify-between gap-4 py-lg sm:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="7" y="2" width="10" height="20" rx="2" stroke="#fff" strokeWidth="1.6" />
              <circle cx="12" cy="18.3" r="0.9" fill="#fff" />
            </svg>
          </span>
          <span className="text-label-sm font-semibold text-on-surface">Mobile Bar</span>
        </div>
        <p className="text-caption text-on-surface-variant">
          © {new Date().getFullYear()} Mobile Bar. Precision engineering, curated for the connoisseur.
        </p>
      </div>
    </footer>
  );
}
