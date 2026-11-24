import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { CalorieFormula, ExerciseList, WorkoutStats } from "@/components/workout-detail";
import { formatDateShort } from "@/lib/format";
import { currentEmail } from "@/lib/session";
import { workoutTitle } from "@/lib/types";
import { fetchWorkout } from "@/lib/workouts";

export const instant = false;

async function Result({ params }: { params: Promise<{ id: string }> }) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const { id } = await params;

  const w = await fetchWorkout(email, id);
  if (w === "missing") notFound();
  if (w === "error") return <Banner tone="error">Server belum bisa dihubungi. Muat ulang halaman.</Banner>;

  const title = workoutTitle(
    w,
    w.exercises.map((e) => e.name),
  );

  return (
    <>
      <div className="pt-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok text-3xl text-white">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Tersimpan</h1>
        <p className="mt-1 text-base text-muted">
          {title} · {formatDateShort(w.started_at)}
        </p>
      </div>

      <WorkoutStats w={w} />
      <CalorieFormula w={w} />
      <ExerciseList w={w} />

      <div className="space-y-3 pt-2">
        <ButtonLink href={`/sesi/${w.id}`} variant="secondary" block>
          Lihat detail
        </ButtonLink>
        <ButtonLink href={`/catat?jenis=${w.kind}`} variant="secondary" block>
          Catat lagi
        </ButtonLink>
        <ButtonLink href="/dashboard" variant="success" block>
          Selesai
        </ButtonLink>
      </div>
    </>
  );
}

export default function TersimpanPage({ params }: PageProps<"/catat/tersimpan/[id]">) {
  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-5">
        <Suspense
          fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-line/60" aria-busy="true" aria-label="Memuat" />}
        >
          <Result params={params} />
        </Suspense>
      </div>
    </main>
  );
}
