import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { GoogleButton } from "@/components/google-button";
import { signInWithGoogle } from "./actions";

export const instant = false;

async function LoginError({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (!error) return null;

  const message =
    error === "server"
      ? "Server belum bisa dihubungi. Coba lagi sebentar."
      : "Gagal masuk dengan Google. Coba lagi.";

  return (
    <p role="alert" className="mb-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-ink">
      {message}
    </p>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-dvh flex-col bg-paper px-6 pb-10 pt-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
          <Brand />
        </div>

        <Suspense fallback={null}>
          <LoginError searchParams={searchParams} />
        </Suspense>

        <form action={signInWithGoogle}>
          <GoogleButton label="Masuk dengan Google" />
        </form>
        <p className="mt-4 text-center text-sm text-muted">Hanya email yang diizinkan.</p>
      </div>
    </main>
  );
}
