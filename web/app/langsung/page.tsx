import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { goFetch } from "@/lib/go-api";
import { currentEmail } from "@/lib/session";
import type { Template } from "@/lib/template-types";
import { TemplatePicker } from "./template-picker";
import { SessionGuard } from "./session-guard";

export const instant = false;

async function loadTemplates(email: string): Promise<Template[]> {
  try {
    const res = await goFetch("/v1/templates", email);
    if (!res.ok) return [];
    return (await res.json()) as Template[];
  } catch {
    return [];
  }
}

export default async function LangsungPage() {
  const email = await currentEmail();
  if (!email) redirect("/login");
  const templates = await loadTemplates(email);

  return (
    <main className="min-h-dvh bg-paper px-4 pb-10 pt-2">
      <div className="mx-auto w-full max-w-md space-y-5">
        <SessionGuard />
        <PageHeader title="Latihan langsung" backHref="/dashboard" />

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">Mulai tanpa template</p>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/langsung/sesi?kind=gym"
              className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-card py-5 text-sm font-medium text-ink hover:bg-card/80 transition-colors"
            >
              <span className="text-2xl">🏋️</span>
              Gym / Beban
            </Link>
            <Link
              href="/langsung/sesi?kind=bodyweight"
              className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-card py-5 text-sm font-medium text-ink hover:bg-card/80 transition-colors"
            >
              <span className="text-2xl">🤸</span>
              Bodyweight
            </Link>
          </div>
        </div>

        <TemplatePicker templates={templates} />

        <Link
          href="/template"
          className="block text-center text-sm text-accent hover:underline"
        >
          Kelola template →
        </Link>
      </div>
    </main>
  );
}
