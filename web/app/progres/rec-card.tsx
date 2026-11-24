"use client";

import { useTransition } from "react";
import { dismissRec, starRec, refreshRecs } from "./rec-actions";

export type Recommendation = {
  id: string;
  content: string;
  generated_at: string;
  starred_at?: string | null;
  dismissed_at?: string | null;
};

function RecItem({ rec }: { rec: Recommendation }) {
  const [pending, startTransition] = useTransition();
  const starred = !!rec.starred_at;

  return (
    <div
      className={`flex gap-3 items-start rounded-2xl border px-4 py-3 transition-opacity ${
        starred ? "border-accent/40 bg-accent/5" : "border-line bg-card"
      } ${pending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <p className="flex-1 text-sm text-ink leading-relaxed">{rec.content}</p>
      <div className="flex gap-1 shrink-0 mt-0.5">
        {/* Bintang */}
        <button
          aria-label={starred ? "Lepas bintang" : "Simpan"}
          onClick={() => startTransition(() => starRec(rec.id))}
          className={`h-7 w-7 rounded-lg flex items-center justify-center text-sm transition-colors ${
            starred
              ? "text-accent bg-accent/10 hover:bg-accent/20"
              : "text-muted hover:text-ink hover:bg-surface"
          }`}
        >
          {starred ? "★" : "☆"}
        </button>
        {/* Abaikan (hanya tampil kalau belum di-bintang) */}
        {!starred && (
          <button
            aria-label="Abaikan"
            onClick={() => startTransition(() => dismissRec(rec.id))}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sm text-muted hover:text-ink hover:bg-surface transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function RecSection({
  recs,
  error,
}: {
  recs: Recommendation[];
  error?: string;
}) {
  const [pending, startTransition] = useTransition();

  if (error) {
    return (
      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-xs text-muted">
          Rekomendasi tidak tersedia: {error}
        </p>
      </div>
    );
  }

  if (recs.length === 0) return null;

  const starred = recs.filter((r) => r.starred_at);
  const active = recs.filter((r) => !r.starred_at);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Rekomendasi
        </p>
        <button
          onClick={() => startTransition(() => refreshRecs())}
          disabled={pending}
          className="text-xs text-accent hover:underline disabled:opacity-50"
        >
          {pending ? "Memuat…" : "Perbarui"}
        </button>
      </div>

      {starred.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">★ Tersimpan</p>
          {starred.map((r) => (
            <RecItem key={r.id} rec={r} />
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {starred.length > 0 && (
            <p className="text-xs text-muted">Saran baru</p>
          )}
          {active.map((r) => (
            <RecItem key={r.id} rec={r} />
          ))}
        </div>
      )}
    </div>
  );
}
