import { Suspense } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { currentEmail } from "@/lib/session";
import { BottomNav, FabMenu } from "@/components/ui/bottom-nav";
import { ButtonLink } from "@/components/ui/button";
import { goFetch } from "@/lib/go-api";
import { SessionRecovery } from "./session-recovery";

type Me = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

async function UserCard() {
  const email = await currentEmail();
  if (!email) redirect("/login");

  const res = await goFetch("/v1/me", email);
  if (!res.ok) redirect("/denied");
  const me = (await res.json()) as Me;

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Masuk sebagai</p>
      <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-50">
        {me.name ?? me.email}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {me.email} · {me.role}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-10 pb-28 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">RushFit</h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
          >
            Keluar
          </button>
        </form>
      </div>
      <Suspense fallback={<div className="h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />}>
        <UserCard />
      </Suspense>
      <SessionRecovery />
      <ButtonLink href="/catat" block>
        ✎ Catat diary
      </ButtonLink>
      <FabMenu items={[
        { label: "Catat diary", href: "/catat", icon: "✎" },
        { label: "Latihan langsung", href: "/langsung", icon: "▶" },
      ]} />
      <BottomNav active="beranda" />
    </main>
  );
}
