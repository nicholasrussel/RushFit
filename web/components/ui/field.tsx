import type { ComponentProps, ReactNode } from "react";

/** Label + isi + keterangan. Dipakai untuk membungkus input apa pun. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

const box =
  "flex h-12 w-full items-center rounded-xl border border-line bg-card text-ink " +
  "focus-within:border-ink focus-within:ring-1 focus-within:ring-ink";

/** Input teks/angka dengan satuan opsional di kanan (kg, km, …). */
export function TextInput({ unit, className = "", ...props }: { unit?: string } & ComponentProps<"input">) {
  return (
    <div className={`${box} ${className}`}>
      <input
        className="h-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-base outline-none placeholder:text-muted/60"
        {...props}
      />
      {unit ? <span className="pr-4 text-sm text-muted">{unit}</span> : null}
    </div>
  );
}

export function Select({ className = "", children, ...props }: ComponentProps<"select">) {
  return (
    <div className={`${box} relative ${className}`}>
      <select
        className="h-full w-full appearance-none rounded-xl bg-transparent pl-4 pr-10 text-base outline-none"
        {...props}
      >
        {children}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-4 text-muted">
        ▾
      </span>
    </div>
  );
}

export function TextArea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`w-full rounded-xl border border-line bg-card px-4 py-3 text-base text-ink outline-none placeholder:text-muted/60 focus:border-ink focus:ring-1 focus:ring-ink ${className}`}
      {...props}
    />
  );
}
