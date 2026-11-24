"use client";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  /** Penanda kecil, mis. "Segera". */
  badge?: string;
};

/** Segmen pilihan tunggal: Cardio | Gym | Bodyweight. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border border-line bg-card p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-45 ${
              active ? "bg-ink text-paper" : "text-ink hover:bg-ink/5"
            }`}
          >
            {o.label}
            {o.badge ? (
              <span className="rounded bg-ink/10 px-1 py-0.5 text-[10px] uppercase tracking-wide">{o.badge}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
