export default function Loader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-on-surface-variant">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-container-high border-t-primary" />
      <span className="text-caption uppercase tracking-widest">{label}…</span>
    </div>
  );
}
