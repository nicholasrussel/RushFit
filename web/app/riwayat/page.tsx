import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { BottomNav, FabMenu } from "@/components/ui/bottom-nav";
import { ButtonLink } from "@/components/ui/button";
import { ChipLink } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import {
  formatClock,
  formatDateShort,
  formatDistance,
  formatDurationShort,
  formatKcal,
  weekLabel,
  weekStartKey,
  type Unit,
} from "@/lib/format";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import { workoutTitle, type WorkoutKind, type WorkoutSummary } from "@/lib/types";

export const instant = false;

const FILTERS: { value: WorkoutKind | ""; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "cardio", label: "Cardio" },
  { value: "gym", label: "Gym" },
  { value: "bodyweight", label: "Bodyweight" },
];

const KIND_BADGE: Record<WorkoutKind, string> = { cardio: "C", gym: "G", bodyweight: "B" };

function subline(w: WorkoutSummary, unit: Unit = "metric"): string {
  const parts = [formatDateShort(w.started_at)];
  if (w.cardio) {
    parts.push(formatDistance(w.cardio.distance_m, unit));
    if (w.duration_sec) parts.push(formatClock(w.duration_sec));
  } else {
    parts.push(w.duration_sec ? formatDurationShort(w.duration_sec) : `${w.set_count} set`);
  }
  return parts.join(" · ");
}

function SessionCard({ w, unit }: { w: WorkoutSummary; unit: Unit }) {
  return (
    <Link
      href={`/sesi/${w.id}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 hover:border-ink focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/10 text-sm font-semibold text-ink"
      >
        {KIND_BADGE[w.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ink">{workoutTitle(w, w.exercise_names)}</span>
        <span className="block truncate text-sm text-muted">{subline(w, unit)}</span>
      </span>
      {w.calories != null ? (
        <span className="shrink-0 text-sm font-medium text-accent tabular-nums">{formatKcal(w.calories)}</span>
      ) : null}
    </Link>
  );
}

async function History({ searchParams }: { searchParams: Promise<{ jenis?: string | string[] }> }) {
  const email = await currentEmail();
  if (!email) redirect("/login");

  const { jenis } = await searchParams;
  const kind = FILTERS.find((f) => f.value !== "" && f.value === jenis)?.value ?? "";

  const [workoutsRes, profileRes] = await Promise.allSettled([
    goFetch(`/v1/workouts${kind ? `?kind=${kind}` : ""}`, email),
    goFetch("/v1/profile", email),
  ]);

  let list: WorkoutSummary[] | null = null;
  if (workoutsRes.status === "fulfilled" && workoutsRes.value.ok) {
    list = (await workoutsRes.value.json()) as WorkoutSummary[];
  }
  const unit: Unit = profileRes.status === "fulfilled" && profileRes.value.ok
    ? ((await profileRes.value.json()) as { unit: string }).unit as Unit
    : "metric";

  // Dikelompokkan per minggu (Senin–Minggu); daftar sudah terurut terbaru dulu.
  const thisWeek = weekStartKey(new Date());
  const groups: { key: string; items: WorkoutSummary[] }[] = [];
  for (const w of list ?? []) {
    const key = weekStartKey(new Date(w.started_at));
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(w);
    else groups.push({ key, items: [w] });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <ChipLink key={f.value} href={f.value ? `/riwayat?jenis=${f.value}` : "/riwayat"} active={f.value === kind}>
            {f.label}
          </ChipLink>
        ))}
      </div>

      {list === null ? (
        <Banner
          tone="error"
          action={
            <ButtonLink href="/riwayat" variant="secondary" size="sm">
              Coba lagi
            </ButtonLink>
          }
        >
          Server belum bisa dihubungi.
        </Banner>
      ) : list.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-ink">Belum ada latihan</p>
          <p className="mt-1 text-sm text-muted">
            {kind
              ? "Belum ada sesi untuk jenis ini."
              : "Catat sesi pertamamu untuk mulai melihat riwayat dan progres."}
          </p>
          <ButtonLink href={kind ? `/catat?jenis=${kind}` : "/catat"} className="mt-5">
            + Catat latihan
          </ButtonLink>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="space-y-2">
            <h2 className="text-sm font-medium text-muted">{weekLabel(g.key, thisWeek)}</h2>
            {g.items.map((w) => (
              <SessionCard key={w.id} w={w} unit={unit} />
            ))}
          </section>
        ))
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Memuat">
      <div className="h-9 w-64 animate-pulse rounded-full bg-line/60" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
      <div className="h-16 animate-pulse rounded-2xl bg-line/60" />
    </div>
  );
}

export default function RiwayatPage({ searchParams }: PageProps<"/riwayat">) {
  return (
    <main className="min-h-dvh bg-paper px-4 pb-40 pt-2">
      <div className="mx-auto w-full max-w-md space-y-4">
        <PageHeader title="Riwayat" />
        <Suspense fallback={<ListSkeleton />}>
          <History searchParams={searchParams} />
        </Suspense>
      </div>
      <FabMenu items={[
        { label: "Catat diary", href: "/catat", icon: "✎" },
        { label: "Latihan langsung", href: "/langsung", icon: "▶" },
      ]} />
      <BottomNav active="riwayat" />
    </main>
  );
}
