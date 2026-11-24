import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import { formatNumber } from "@/lib/format";
import type { ProgressResult } from "../types";
import { ProgressDetail } from "./detail";

export const instant = false;

type RangeParam = "4w" | "12w" | "all";

function rangeLabel(r: RangeParam): string {
  return r === "4w" ? "4 mgg" : r === "12w" ? "12 mgg" : "Semua";
}

async function loadProgress(email: string, exerciseId: string, range: RangeParam): Promise<ProgressResult | null | 404> {
  try {
    const res = await goFetch(`/v1/progress/${exerciseId}?range=${range}`, email);
    if (res.status === 404) return 404;
    if (!res.ok) return null;
    return (await res.json()) as ProgressResult;
  } catch {
    return null;
  }
}

export default async function ProgresDetailPage({ params, searchParams }: PageProps<"/progres/[id]">) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const { id } = await params;
  const sp = await searchParams;
  const range: RangeParam =
    sp.range === "4w" || sp.range === "12w" || sp.range === "all" ? sp.range : "12w";

  const data = await loadProgress(email, id, range);
  if (data === 404) notFound();

  if (data === null) {
    return (
      <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
        <div className="mx-auto w-full max-w-md space-y-4">
          <PageHeader title="Progres gerakan" backHref="/progres" />
          <p className="text-sm text-danger">Server belum bisa dihubungi. Muat ulang halaman.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-5">
        <PageHeader title={data.exercise_name} backHref="/progres" />

        {/* Range selector */}
        <div className="flex gap-2">
          {(["4w", "12w", "all"] as RangeParam[]).map((r) => (
            <a
              key={r}
              href={`/progres/${id}?range=${r}`}
              className={`flex-1 rounded-xl py-2 text-center text-sm font-medium transition-colors ${
                range === r
                  ? "bg-accent text-white"
                  : "border border-line bg-card text-muted hover:text-ink"
              }`}
            >
              {rangeLabel(r)}
            </a>
          ))}
        </div>

        {data.points.length < 1 ? (
          <div className="py-8 text-center space-y-1">
            <p className="text-sm font-medium text-ink">Belum ada data dalam rentang ini</p>
            <p className="text-xs text-muted">Coba pilih rentang yang lebih lebar.</p>
          </div>
        ) : (
          <ProgressDetail data={data} />
        )}
      </div>
    </main>
  );
}
