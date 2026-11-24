import { Brand } from "@/components/brand";
import { GoogleButton } from "@/components/google-button";
import { signInWithOtherAccount } from "../login/actions";

export default function DeniedPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-paper px-6 pb-10 pt-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center">
          <Brand />
        </div>

        <div role="alert" className="mb-4 rounded-xl border border-line bg-card px-4 py-4">
          <p className="font-medium text-ink">Email ini belum diizinkan.</p>
          <p className="mt-1 text-sm text-muted">
            Hubungi pemilik aplikasi agar emailmu ditambahkan ke daftar izin.
          </p>
        </div>

        <form action={signInWithOtherAccount}>
          <GoogleButton label="Coba akun lain" />
        </form>
      </div>
    </main>
  );
}
