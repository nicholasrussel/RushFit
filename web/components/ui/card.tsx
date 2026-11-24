import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`} {...props} />;
}

/** Kartu hasil: label kecil di atas, angka besar di bawah. accent untuk kalori. */
export function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-0.5 text-xl font-semibold tabular-nums ${accent ? "text-accent" : "text-ink"}`}>{value}</p>
    </div>
  );
}
