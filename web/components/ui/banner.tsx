import type { ReactNode } from "react";

/** Pita: kuning untuk info/mode demo, merah untuk kegagalan. */
export function Banner({
  tone = "info",
  children,
  action,
}: {
  tone?: "info" | "error";
  children: ReactNode;
  action?: ReactNode;
}) {
  const style =
    tone === "error" ? "border-danger/40 bg-danger/10 text-danger" : "border-warn/30 bg-warn-bg text-warn";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${style}`}
    >
      <div>{children}</div>
      {action}
    </div>
  );
}
