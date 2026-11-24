export function Brand() {
  return (
    <div className="text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
        <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M13.5 2 4 13.5h6.5L9.5 22 20 10h-6.5l0-8z" />
        </svg>
      </div>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">RushFit</h1>
      <p className="mt-2 text-base text-muted">Catat latihan, lihat kemajuan.</p>
    </div>
  );
}
