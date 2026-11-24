import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/auth";
import { BottomNav } from "@/components/ui/bottom-nav";
import { ButtonLink } from "@/components/ui/button";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import { fetchAllExercises } from "@/lib/exercises";
import { UnitToggle } from "./unit-toggle";
import { WeightEditor } from "./weight-editor";
import type { Unit } from "@/lib/format";

export const instant = false;

type Me = { id: string; email: string; name: string | null; role: string };
type Profile = { weight_kg: number | null; unit: string };

async function ProfileContent() {
  const email = await currentEmail();
  if (!email) redirect("/login");

  const [meRes, profileRes, exercises] = await Promise.all([
    goFetch("/v1/me", email),
    goFetch("/v1/profile", email),
    fetchAllExercises(email),
  ]);

  if (!meRes.ok) redirect("/denied");
  const me = (await meRes.json()) as Me;
  const profile: Profile = profileRes.ok ? await profileRes.json() : { weight_kg: null, unit: "metric" };
  const exerciseCount = Array.isArray(exercises) ? exercises.length : 0;

  return (
    <>
      {/* User card */}
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-bold text-paper">
            {(me.name ?? me.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{me.name ?? me.email}</p>
            <p className="truncate text-sm text-muted">{me.email}</p>
          </div>
        </div>
      </div>

      {/* Berat badan */}
      <div className="rounded-2xl border border-line bg-card p-5 space-y-2">
        <p className="text-sm font-medium text-muted">Berat badan</p>
        <WeightEditor initial={profile.weight_kg} unit={profile.unit as Unit} />
        <p className="text-xs text-muted">
          Dipakai untuk menghitung kalori. Setiap sesi menyimpan berat badan saat dicatat.
        </p>
      </div>

      {/* Satuan */}
      <div className="rounded-2xl border border-line bg-card p-5 space-y-3">
        <p className="text-sm font-medium text-muted">Satuan</p>
        <UnitToggle initial={profile.unit as Unit} />
        <p className="text-xs text-muted">Mempengaruhi tampilan jarak, kecepatan, dan berat badan.</p>
      </div>

      {/* Gerakan saya */}
      <Link
        href="/profil/gerakan"
        className="flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-4 hover:bg-paper transition-colors"
      >
        <span className="font-medium text-ink">Gerakan saya</span>
        <span className="text-sm text-muted">{exerciseCount} ›</span>
      </Link>

      {/* Keluar */}
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-2xl border border-line bg-card px-5 py-4 text-left font-medium text-danger hover:bg-paper transition-colors"
        >
          Keluar
        </button>
      </form>

      <div>
        <ButtonLink href="/catat" block>
          ✎ Catat diary
        </ButtonLink>
      </div>
    </>
  );
}

export default function ProfilPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6 space-y-4">
      <h1 className="text-2xl font-semibold text-ink">Profil</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-line/60" />}>
        <ProfileContent />
      </Suspense>
      <BottomNav active="profil" />
    </main>
  );
}
