"use client";

const cell =
  "h-12 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-center text-base text-ink tabular-nums outline-none " +
  "placeholder:text-muted/60 focus:border-ink focus:ring-1 focus:ring-ink";

export function SetRowHeader({
  showWeight = true,
  weightLabel = "Beban (kg)",
  repsLabel = "Rep",
}: {
  showWeight?: boolean;
  weightLabel?: string;
  repsLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <span className="w-7 text-center">Set</span>
      {showWeight ? <span className="flex-1 text-center">{weightLabel}</span> : null}
      <span className="flex-1 text-center">{repsLabel}</span>
      <span className="w-10" />
    </div>
  );
}

/** Satu baris set: nomor, beban, repetisi, hapus. */
export function SetRow({
  index,
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  onRemove,
  showWeight = true,
}: {
  index: number;
  weight: string;
  reps: string;
  onWeightChange: (value: string) => void;
  onRepsChange: (value: string) => void;
  /** Kosongkan untuk menyembunyikan tombol hapus (mis. set satu-satunya). */
  onRemove?: () => void;
  showWeight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 text-center text-base font-medium text-muted tabular-nums">{index}</span>
      {showWeight ? (
        <input
          className={cell}
          inputMode="decimal"
          aria-label={`Beban set ${index} (kg)`}
          placeholder="0"
          value={weight}
          onChange={(e) => onWeightChange(e.target.value)}
        />
      ) : null}
      <input
        className={cell}
        inputMode="numeric"
        aria-label={`Repetisi set ${index}`}
        placeholder="0"
        value={reps}
        onChange={(e) => onRepsChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!onRemove}
        aria-label={`Hapus set ${index}`}
        className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl text-xl text-muted hover:bg-ink/5 disabled:invisible"
      >
        ×
      </button>
    </div>
  );
}
