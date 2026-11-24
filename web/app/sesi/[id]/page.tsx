import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CalorieFormula, ExerciseList, WorkoutStats } from "@/components/workout-detail";
import { formatDateShort, formatDurationShort, type Unit } from "@/lib/format";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import { workoutTitle } from "@/lib/types";
import { fetchWorkout } from "@/lib/workouts";
import { DeleteButton } from "./delete-button";

export const instant = false;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const { id } = await params;

  const [w, profileRes] = await Promise.all([
    fetchWorkout(email, id),
    goFetch("/v1/profile", email).catch(() => null),
  ]);
  if (w === "missing") notFound();
  if (w === "error") {
    return (
      <>
        <PageHeader title="Sesi" backHref="/riwayat" />
        <Banner tone="error">Server belum bisa dihubungi. Muat ulang halaman.</Banner>
      </>
    );
  }

  const unit: Unit = profileRes?.ok
    ? ((await profileRes.json()) as { unit: string }).unit as Unit
    : "metric";

  const title = workoutTitle(
    w,
    w.exercises.map((e) => e.name),
  );

  return (
    <>
      <div>
        <PageHeader title={title} backHref="/riwayat" />
        <p className="text-sm text-muted">
          {formatDateShort(w.started_at)}
          {w.duration_sec ? ` · ${formatDurationShort(w.duration_sec)}` : ""}
        </p>
      </div>

      <WorkoutStats w={w} unit={unit} />
      <CalorieFormula w={w} />
      <ExerciseList w={w} unit={unit} />

      {w.notes ? (
        <div>
          <p className="text-sm font-medium text-muted">Catatan</p>
          <p className="mt-1 whitespace-pre-wrap text-base text-ink">{w.notes}</p>
        </div>
      ) : null}

      <div className="flex gap-3 pt-2">
        <ButtonLink href={`/sesi/${w.id}/edit`} variant="secondary" className="flex-1">
          Edit
        </ButtonLink>
        <DeleteButton id={w.id} />
      </div>
    </>
  );
}

export default function SesiPage({ params }: PageProps<"/sesi/[id]">) {
  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-5">
        <Suspense
          fallback={<div className="mt-14 h-64 animate-pulse rounded-2xl bg-line/60" aria-busy="true" aria-label="Memuat" />}
        >
          <Detail params={params} />
        </Suspense>
      </div>
    </main>
  );
}
