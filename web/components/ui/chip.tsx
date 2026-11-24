import Link from "next/link";
import type { ComponentProps } from "react";

const chipClass = (active: boolean) =>
  `inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
    active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:bg-ink/5"
  }`;

/** Chip yang berpindah halaman, mis. filter riwayat lewat URL. */
export function ChipLink({
  active = false,
  className = "",
  ...props
}: { active?: boolean } & ComponentProps<typeof Link>) {
  return <Link aria-current={active ? "true" : undefined} className={`${chipClass(active)} ${className}`} {...props} />;
}

/** Pil kecil untuk filter (Semua, Cardio, Gym) dan pintasan (15 mnt, 30 mnt). */
export function Chip({
  active = false,
  className = "",
  type = "button",
  ...props
}: { active?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:bg-ink/5"
      } ${className}`}
      {...props}
    />
  );
}
