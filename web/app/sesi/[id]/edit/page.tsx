import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CardioForm } from "@/app/catat/cardio-form";
import { StrengthForm } from "@/app/catat/strength-form";
import { Banner } from "@/components/ui/banner";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { Exercise } from "@/lib/types";
import { type Unit } from "@/lib/format";
import { fetchWorkout } from "@/lib/workouts";

export const instant = false;

async function EditForm({ params }: { params: Promise<{ id: string }> }) {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const { id } = await params;

  const [w, profileRes] = await Promise.all([
    fetchWorkout(email, id),
    goFetch("/v1/profile", email).catch(() => null),
  ]);
  if (w === "missing") notFound();
  if (w === "error") return <Banner tone="error">Server belum bisa dihubungi. Muat ulang halaman.</Banner>;

  const unit: Unit = profileRes?.ok
    ? ((await profileRes.json()) as { unit: string }).unit as Unit
    : "metric";

  // Kalori sesi lama dihitung dari berat badan yang tersimpan di sesi itu.
  if (w.kind === "cardio") return <CardioForm weightKg={w.body_weight_kg} initial={w} unit={unit} />;

  let exercises: Exercise[];
  try {
    const res = await goFetch(`/v1/exercises?kind=${w.kind}`, email);
    if (!res.ok) throw new Error("exercises");
    exercises = (await res.json()) as Exercise[];
  } catch {
    return <Banner tone="error">Server belum bisa dihubungi. Muat ulang halaman.</Banner>;
  }
  return <StrengthForm kind={w.kind} exercises={exercises} weightKg={w.body_weight_kg} initial={w} unit={unit} />;
}

export default function EditSesiPage({ params }: PageProps<"/sesi/[id]/edit">) {
  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Suspense fallback={<div className="h-12" />}>
          <BackHeader params={params} />
        </Suspense>
        <Suspense
          fallback={<div className="h-64 animate-pulse rounded-2xl bg-line/60" aria-busy="true" aria-label="Memuat" />}
        >
          <EditForm params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function BackHeader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageHeader title="Edit sesi" backHref={`/sesi/${encodeURIComponent(id)}`} />;
}
