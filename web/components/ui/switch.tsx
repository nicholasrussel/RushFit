"use client";

/** Sakelar hidup/mati dengan label di kiri, mis. "Pakai beban tambahan". */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex h-12 w-full items-center justify-between gap-3 rounded-xl text-left text-base text-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-ok" : "bg-line"
        }`}
      >
        <span className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}
