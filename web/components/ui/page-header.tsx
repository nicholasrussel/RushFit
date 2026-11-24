import Link from "next/link";

/** Judul layar dengan tombol kembali: "‹ Catat diary". */
export function PageHeader({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <header className="flex h-12 items-center gap-1">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Kembali"
          className="-ml-3 flex h-12 w-10 items-center justify-center rounded-xl text-2xl text-ink hover:bg-ink/5"
        >
          ‹
        </Link>
      ) : null}
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
    </header>
  );
}
