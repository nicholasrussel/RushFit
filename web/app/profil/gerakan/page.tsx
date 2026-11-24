import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Banner } from "@/components/ui/banner";
import { currentEmail } from "@/lib/session";
import { fetchAllExercises } from "@/lib/exercises";
import { ExerciseList } from "./exercise-list";

export const instant = false;

async function Content() {
  const email = await currentEmail();
  if (!email) redirect("/login");

  const exercises = await fetchAllExercises(email);
  if (exercises === "error") {
    return <Banner tone="error">Server belum bisa dihubungi. Muat ulang halaman.</Banner>;
  }

  return <ExerciseList exercises={exercises} />;
}

export default function GerakanPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-10 pt-4 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/profil" className="text-sm text-muted hover:text-ink">
          ← Profil
        </Link>
        <h1 className="text-xl font-semibold text-ink">Gerakan saya</h1>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-line/60" />}>
        <Content />
      </Suspense>
    </main>
  );
}
