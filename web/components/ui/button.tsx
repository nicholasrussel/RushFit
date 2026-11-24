import Link from "next/link";
import type { ComponentProps } from "react";

export type ButtonVariant = "primary" | "secondary" | "success" | "danger" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-opacity " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-paper hover:opacity-90", // Simpan
  secondary: "border border-line bg-card text-ink hover:bg-paper", // Batal
  success: "bg-ok text-white hover:opacity-90", // Selesai
  danger: "border border-danger/50 text-danger hover:bg-danger/10", // Hapus
  ghost: "text-ink hover:bg-ink/5",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-12 px-5 text-base", // target sentuh ≈48 px
  sm: "h-10 px-3 text-sm",
};

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean };

export function buttonClass({ variant = "primary", size = "md", block = false }: StyleProps = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${block ? "w-full" : ""}`;
}

export function Button({
  variant,
  size,
  block,
  className = "",
  type = "button",
  ...props
}: StyleProps & ComponentProps<"button">) {
  return <button type={type} className={`${buttonClass({ variant, size, block })} ${className}`} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  block,
  className = "",
  ...props
}: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={`${buttonClass({ variant, size, block })} ${className}`} {...props} />;
}
