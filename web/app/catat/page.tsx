import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Banner } from "@/components/ui/banner";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { Exercise, Profile } from "@/lib/types";
import { DiaryForm } from "./diary-form";

export const instant = false;

async function loadFormData(email: string): Promise<{ profile: Profile; gym: Exercise[]; bodyweight: Exercise[] } | null> {
  try {
    const [profileRes, gymRes, bodyweightRes] = await Promise.all([
      goFetch("/v1/profile", email),
      goFetch("/v1/exercises?kind=gym", email),
      goFetch("/v1/exercises?kind=bodyweight", email),
    ]);
    if (!profileRes.ok || !gymRes.ok || !bodyweightRes.ok) return null;
    return {
      profile: (await profileRes.json()) as Profile,
      gym: (await gymRes.json()) as Exercise[],
      bodyweight: (await bodyweightRes.json()) as Exercise[],
    };
  } catch {
    return null;
  }
}

async function Diary({ searchParams }: { searchParams: Promise<{ jenis?: string | string[] }> }) {
  const email = await currentEmail();
  if (!email) redirect("/login");

  const { jenis } = await searchParams;
  const data = await loadFormData(email);
  if (!data) {
    return (
      <Banner
        tone="error"
        action={
          <ButtonLink href="/catat" variant="secondary" size="sm">
            Coba lagi
          </ButtonLink>
        }
      >
        Server belum bisa dihubungi.
      </Banner>
    );
  }

  return (
    <DiaryForm
      initialKind={jenis === "gym" || jenis === "bodyweight" ? jenis : "cardio"}
      profile={data.profile}
      gymExercises={data.gym}
      bodyweightExercises={data.bodyweight}
    />
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Memuat">
      <div className="h-12 animate-pulse rounded-xl bg-line/60" />
      <div className="h-12 animate-pulse rounded-xl bg-line/60" />
      <div className="h-12 animate-pulse rounded-xl bg-line/60" />
      <div className="h-24 animate-pulse rounded-xl bg-line/60" />
    </div>
  );
}

export default function CatatPage({ searchParams }: PageProps<"/catat">) {
  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-4">
        <PageHeader title="Catat diary" backHref="/dashboard" />
        <Suspense fallback={<FormSkeleton />}>
          <Diary searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
